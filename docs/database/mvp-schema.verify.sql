-- Run ONLY after mvp-schema.sql in an isolated, empty test database.
-- Fixtures are rolled back. These assertions verify DB constraints, not service behavior.
BEGIN;

CREATE FUNCTION pg_temp.expect_sqlstate(statement text, expected text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE actual text;
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS actual = RETURNED_SQLSTATE;
        IF actual = expected THEN RETURN; END IF;
        RAISE EXCEPTION 'Expected SQLSTATE %, got %: %', expected, actual, SQLERRM;
    END;
    RAISE EXCEPTION 'Expected SQLSTATE %, but statement succeeded: %', expected, statement;
END;
$$;

DO $$
DECLARE
    buyer uuid := gen_random_uuid();
    owner_id uuid := gen_random_uuid();
    cat uuid := gen_random_uuid();
    event_a uuid := gen_random_uuid();
    event_b uuid := gen_random_uuid();
    type_a uuid := gen_random_uuid();
    type_b uuid := gen_random_uuid();
    order_a uuid := gen_random_uuid();
    order_b uuid := gen_random_uuid();
    item_a uuid := gen_random_uuid();
    payment_a uuid := gen_random_uuid();
    payment_b uuid := gen_random_uuid();
    ticket_a uuid := gen_random_uuid();
    checks integer := 0;
BEGIN
    INSERT INTO users ("idUser",name,email,password) VALUES
        (buyer,'Buyer','buyer@example.test','fixture-hash'),
        (owner_id,'Organizer','organizer@example.test','fixture-hash');
    INSERT INTO categories (id,name,slug) VALUES (cat,'Music','music');
    INSERT INTO events (id,organizer_id,category_id,slug,title,description,venue_name,address,city_code,
        starts_at,ends_at,checkin_opens_at,checkin_closes_at)
    VALUES (event_a,owner_id,cat,'event-a','Event A','Demo','Hall A','Address A','DN',
        now()+interval '1 day',now()+interval '2 days',now(),now()+interval '2 days'),
        (event_b,owner_id,cat,'event-b','Event B','Demo','Hall B','Address B','DN',
        now()+interval '1 day',now()+interval '2 days',now(),now()+interval '2 days');
    INSERT INTO ticket_types (id,event_id,name,price_amount,capacity,sale_starts_at,sale_ends_at)
    VALUES (type_a,event_a,'Standard',100000,5,now(),now()+interval '1 day'),
        (type_b,event_b,'Standard',100000,5,now(),now()+interval '1 day');
    INSERT INTO orders (id,order_code,buyer_id,event_id,total_quantity,total_amount,buyer_name_snapshot,
        buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,expires_at)
    VALUES (order_a,'ORDER-A',buyer,event_a,1,100000,'Buyer','buyer@example.test','Event A','key-a','hash-a',now()+interval '15 minutes'),
        (order_b,'ORDER-B',buyer,event_b,1,100000,'Buyer','buyer@example.test','Event B','key-b','hash-b',now()+interval '15 minutes');
    INSERT INTO order_items (id,order_id,event_id,ticket_type_id,ticket_type_name_snapshot,unit_price,quantity)
    VALUES (item_a,order_a,event_a,type_a,'Standard',100000,1);
    INSERT INTO reservations (order_item_id,release_after) VALUES (item_a,now()+interval '15 minutes');

    -- 1: item may not select a ticket type from another event.
    PERFORM pg_temp.expect_sqlstate(format('UPDATE order_items SET ticket_type_id=%L WHERE id=%L',type_b,item_a),'23503'); checks := checks+1;
    -- 2: counters may not exceed capacity; 3: negative inventory is rejected.
    PERFORM pg_temp.expect_sqlstate(format('UPDATE ticket_types SET reserved_quantity=6 WHERE id=%L',type_a),'23514'); checks := checks+1;
    PERFORM pg_temp.expect_sqlstate(format('UPDATE ticket_types SET sold_quantity=-1 WHERE id=%L',type_a),'23514'); checks := checks+1;
    -- 4: duplicate checkout idempotency key for the same buyer.
    PERFORM pg_temp.expect_sqlstate(format('UPDATE orders SET idempotency_key=''key-a'' WHERE id=%L',order_b),'23505'); checks := checks+1;
    -- 5: generated price total is correct.
    IF (SELECT line_total FROM order_items WHERE id=item_a) <> 100000 THEN RAISE EXCEPTION 'Wrong line_total'; END IF; checks := checks+1;
    -- 6: paid order requires payment and timestamp; 7: HELD cannot have a release timestamp.
    PERFORM pg_temp.expect_sqlstate(format('UPDATE orders SET status=''PAID'' WHERE id=%L',order_a),'23514'); checks := checks+1;
    PERFORM pg_temp.expect_sqlstate(format('UPDATE reservations SET released_at=now() WHERE order_item_id=%L',item_a),'23514'); checks := checks+1;

    INSERT INTO payments (id,order_id,provider,merchant_account,merchant_reference,amount,provider_expires_at,reconcile_until)
    VALUES (payment_a,order_a,'test','merchant','REF-A',100000,now()+interval '15 minutes',now()+interval '20 minutes'),
        (payment_b,order_b,'test','merchant','REF-B',100000,now()+interval '15 minutes',now()+interval '20 minutes');
    -- 8: one unresolved attempt per order.
    PERFORM pg_temp.expect_sqlstate(format('UPDATE payments SET order_id=%L WHERE id=%L',order_a,payment_b),'23505'); checks := checks+1;
    -- 9: an order cannot choose another order's payment.
    PERFORM pg_temp.expect_sqlstate(format('UPDATE orders SET status=''PAID'',paid_at=now(),paid_payment_id=%L WHERE id=%L',payment_b,order_a),'23503'); checks := checks+1;
    UPDATE payments SET status='SUCCEEDED',succeeded_at=now(),provider_transaction_id='TX-A' WHERE id=payment_a;
    UPDATE orders SET status='PAID',paid_at=now(),paid_payment_id=payment_a WHERE id=order_a;
    UPDATE ticket_types SET sold_quantity=1 WHERE id=type_a;
    UPDATE reservations SET status='CONSUMED',consumed_at=now() WHERE order_item_id=item_a;

    -- 10: second real successful charge can be recorded for review without a second paid order.
    INSERT INTO payments (id,order_id,provider,merchant_account,merchant_reference,provider_transaction_id,status,
        amount,provider_expires_at,reconcile_until,succeeded_at,requires_review,review_reason)
    VALUES (gen_random_uuid(),order_a,'test','merchant','REF-A-DUP','TX-DUP','SUCCEEDED',100000,
        now()+interval '15 minutes',now()+interval '20 minutes',now(),true,'Duplicate charge');
    IF (SELECT count(*) FROM payments WHERE order_id=order_a AND status='SUCCEEDED') <> 2 THEN RAISE EXCEPTION 'Lost real duplicate charge'; END IF; checks := checks+1;
    -- 11: duplicate external transaction ID cannot refer to a different attempt.
    PERFORM pg_temp.expect_sqlstate(format('UPDATE payments SET provider_transaction_id=''TX-A'' WHERE id=%L',payment_b),'23505'); checks := checks+1;

    INSERT INTO tickets (id,order_item_id,event_id,sequence_no,ticket_code,qr_token_hash,qr_token_ciphertext,qr_key_version)
    VALUES (ticket_a,item_a,event_a,1,'TICKET-A','hash-ticket-a','fixture-ciphertext',1);
    -- 12: ticket event must match item event.
    PERFORM pg_temp.expect_sqlstate(format('UPDATE tickets SET event_id=%L WHERE id=%L',event_b,ticket_a),'23503'); checks := checks+1;
    -- 13: duplicate issuance for one item/sequence fails.
    PERFORM pg_temp.expect_sqlstate(format('INSERT INTO tickets (id,order_item_id,event_id,sequence_no,ticket_code,qr_token_hash,qr_token_ciphertext,qr_key_version) VALUES (gen_random_uuid(),%L,%L,1,''TICKET-B'',''hash-ticket-b'',''cipher-b'',1)',item_a,event_a),'23505'); checks := checks+1;
    -- 14: check-in with the wrong event fails.
    PERFORM pg_temp.expect_sqlstate(format('INSERT INTO checkins (ticket_id,event_id,checked_in_by,method) VALUES (%L,%L,%L,''QR'')',ticket_a,event_b,owner_id),'23503'); checks := checks+1;
    INSERT INTO checkins (ticket_id,event_id,checked_in_by,method) VALUES (ticket_a,event_a,owner_id,'QR');
    UPDATE tickets SET status='CHECKED_IN' WHERE id=ticket_a;
    -- 15: duplicate check-in fails.
    PERFORM pg_temp.expect_sqlstate(format('INSERT INTO checkins (ticket_id,event_id,checked_in_by,method) VALUES (%L,%L,%L,''QR'')',ticket_a,event_a,owner_id),'23505'); checks := checks+1;

    INSERT INTO payment_notifications (id,payment_id,provider,merchant_account,dedupe_key,payload_hash,sanitized_payload)
    VALUES (gen_random_uuid(),payment_a,'test','merchant','NOTICE-A','payload-hash','{}');
    -- 16: a replay cannot create a second inbox entry.
    PERFORM pg_temp.expect_sqlstate('INSERT INTO payment_notifications (id,provider,merchant_account,dedupe_key,payload_hash,sanitized_payload) VALUES (gen_random_uuid(),''test'',''merchant'',''NOTICE-A'',''hash'',''{}'')','23505'); checks := checks+1;

    INSERT INTO organizer_applications (id,user_id,organization_name,contact_name,contact_email,contact_phone,description)
    VALUES (gen_random_uuid(),buyer,'Org','Buyer','buyer@example.test','000','Demo');
    -- 17: concurrent organizer applications are bounded by a unique constraint.
    PERFORM pg_temp.expect_sqlstate(format('INSERT INTO organizer_applications (id,user_id,organization_name,contact_name,contact_email,contact_phone,description) VALUES (gen_random_uuid(),%L,''Org'',''Buyer'',''buyer@example.test'',''000'',''Demo'')',buyer),'23505'); checks := checks+1;
    -- 18: deleting an event with commerce records is rejected.
    PERFORM pg_temp.expect_sqlstate(format('DELETE FROM events WHERE id=%L',event_a),'23503'); checks := checks+1;

    IF checks <> 18 THEN RAISE EXCEPTION 'Expected 18 assertions, ran %', checks; END IF;
    RAISE NOTICE 'PASS: % database constraint assertions', checks;
END;
$$;
ROLLBACK;
