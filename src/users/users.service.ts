import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { Injectable } from "@nestjs/common";
import {
  CreateAccountInput,
  CreateAccountOutput,
} from "./dtos/create-account.dto";
import { LoginInput, LoginOutput } from "./dtos/login.dto";
import { JwtService } from "src/jwt/jwt.service";
import { EditProfileInput, EditProfileOutput } from "./dtos/edit-profile.dto";
import { Verification } from "./entities/verification.entity";
import { UserProfileOutput } from "./dtos/user-profile.dto";
import { VerifyEmailOutput } from "./dtos/verify-email.dto";
import { MailService } from "src/mail/mail.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verifications: Repository<Verification>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<CreateAccountOutput> {
    try {
      const exists = await this.users.findOne({ where: { email } });
      if (exists) {
        return { ok: false, error: "There is a user with that email already" };
      }

      const user = await this.users.save(
        this.users.create({ email, password, role }),
      );
      const verification = await this.verifications.save(
        this.verifications.create({
          user,
        }),
      );

      await this.mailService.sendVerificationEmail(
        user.email,
        verification.code,
      );

      return { ok: true };
    } catch (error) {
      return { ok: false, error: "Couldn't create account" };
    }
  }

  async login({ email, password }: LoginInput): Promise<LoginOutput> {
    try {
      const user = await this.users.findOne({
        where: { email },
        select: ["id", "password"],
      });
      if (!user) {
        return { ok: false, error: "User not found" };
      }

      const passwordCorrect = await user.checkPassword(password);
      if (!passwordCorrect) {
        return { ok: false, error: "Wrong password" };
      }

      const token = this.jwtService.sign(user.id);

      return {
        ok: true,
        token,
      };
    } catch (error: unknown) {
      return {
        ok: false,
        error: (error as Error).message,
      };
    }
  }

  async findById(id: number): Promise<UserProfileOutput> {
    try {
      const user = await this.users.findOneOrFail({ where: { id } });

      return {
        ok: true,
        user: user,
      };
    } catch (error) {
      return { ok: false, error: "User Not Found" };
    }
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      const user = (await this.users.findOne({
        where: { id: userId },
      })) as User;
      if (email) {
        user.email = email;

        user.verified = false;
        const verification = await this.verifications.save(
          this.verifications.create({ user }),
        );
        await this.mailService.sendVerificationEmail(
          user.email,
          verification.code,
        );
      }

      if (password) user.password = password;

      await this.users.save(user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "Could not update profile" };
    }
  }

  async verifyEmail(code: string): Promise<VerifyEmailOutput> {
    try {
      const verification = await this.verifications.findOne({
        where: { code },
        relations: ["user"],
      });
      if (!verification) throw new Error("Verification not found");

      verification.user.verified = true;
      await this.users.save(verification.user);
      await this.verifications.delete(verification.id);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: (error as Error).message,
      };
    }
  }
}
