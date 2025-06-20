import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction } from "express";
import { JwtService } from "./jwt.service";
import { UsersService } from "src/users/users.service";

@Injectable()
export class JwtMiddleWare implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if ("x-jwt" in req.headers) {
      const token = req.headers["x-jwt"];
      const decoded = this.jwtService.verify(token as string);

      // eslint-disable-next-line no-prototype-builtins
      if (typeof decoded === "object" && decoded.hasOwnProperty("id")) {
        try {
          const user = await this.userService.findById(decoded["id"]);
          req["user"] = user;
        } catch (error) {
          console.error(error);
        }
      }
    }
    next();
  }
}
