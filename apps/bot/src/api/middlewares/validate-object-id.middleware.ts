import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Middleware factory to validate a route param is a valid MongoDB ObjectId.
 */
export function validateObjectId(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName] as string;
    if (!mongoose.Types.ObjectId.isValid(value)) {
      res.status(400).json({ error: `Invalid ${paramName}` });
      return;
    }
    next();
  };
}
