import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "@/utils/error.response";
import { AppDataSource } from "@/configs/database.config";
import { User } from "@/modules/auth/models/user.model";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

interface JwtPayload {
  userId: string;
}

export interface AuthContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      auth?: AuthContext;
    }
  }
}

const getUserAuthContext = async (userId: string): Promise<AuthContext> => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { idUser: userId },
    relations: {
      roles: {
        permissions: true,
      },
    },
  });

  if (!user) throw new AppError(401, "User not found");

  const roles = user.roles?.map(role => role.code) || [];
  const permissions = [
    ...new Set(
      user.roles?.flatMap(role => role.permissions?.map(permission => permission.code) || []) || []
    ),
  ];

  return {
    userId: user.idUser,
    roles,
    permissions,
  };
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Authorization header missing or invalid");
    }

    const token = authHeader.split(" ")[1];
    if (!token) throw new AppError(401, "Token not provided");

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not defined in environment");

    const decoded = jwt.verify(token, secret) as JwtPayload;
    if (!decoded.userId) throw new AppError(401, "Invalid token payload");

    const authContext = await getUserAuthContext(decoded.userId);

    req.user = {
      userId: authContext.userId,
    };
    req.auth = authContext;

    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      next(new AppError(401, "Invalid token"));
    } else if (error.name === "TokenExpiredError") {
      next(new AppError(401, "Token expired"));
    } else {
      next(error);
    }
  }
};

export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return next(new AppError(401, "Unauthorized"));

    const hasAllPermissions = requiredPermissions.every(permission =>
      auth.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return next(new AppError(403, "Forbidden: insufficient permissions"));
    }

    next();
  };
};

export const requireRoles = (...requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return next(new AppError(401, "Unauthorized"));

    const hasRole = requiredRoles.some(role => auth.roles.includes(role));
    if (!hasRole) {
      return next(new AppError(403, "Forbidden: insufficient role"));
    }

    next();
  };
};

export const checkAccountStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.auth?.userId || req.user?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { idUser: userId },
      select: ["emailVerified"],
    });

    if (!user) throw new AppError(404, "User not found");

    next();
  } catch (error: any) {
    next(error);
  }
};
