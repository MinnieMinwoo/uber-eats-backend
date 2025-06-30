import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { DataSource, Repository } from "typeorm";
import { User } from "src/users/entities/user.entity";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Verification } from "src/users/entities/verification.entity";

jest.mock("got", () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = "/graphql";

const testUser = {
  email: "test@testmail.com",
  password: "12345",
};

describe("UserModule (e2e)", () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let usersRepository: Repository<User>;
  let verificationRepository: Repository<Verification>;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set("X-JWT", jwtToken).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    verificationRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  describe("createAccount", () => {
    const query = `
      mutation {
        createAccount(input: {
          email:"${testUser.email}",
          password:"${testUser.password}",
          role:Owner
        }) {
          ok
          error
        }
      }`;

    it("should create account", async () => {
      const { status, body } = await publicTest(query);
      const { ok, error } = body.data.createAccount;

      expect(status).toBe(200);
      expect(ok).toBe(true);
      expect(error).toBeNull();
    });

    it("should fail if account already exists", async () => {
      const { status, body } = await publicTest(query);
      const { ok, error } = body.data.createAccount;

      expect(status).toBe(200);
      expect(ok).toBe(false);
      expect(error).toEqual(expect.any(String));
    });
  });

  describe("login", () => {
    it("should login with correct credentials", async () => {
      const query = `
      mutation {
        login(input: {
          email:"${testUser.email}",
          password:"${testUser.password}",
        }) {
          ok
          error
          token
        }
      }`;

      const { status, body } = await publicTest(query);
      const { ok, error, token } = body.data.login;

      expect(status).toBe(200);
      expect(ok).toBe(true);
      expect(error).toBeNull();
      expect(token).toEqual(expect.any(String));
      jwtToken = token;
    });

    it("should not be able to login with wrong credentials", async () => {
      const query = `
      mutation {
        login(input: {
          email:"${testUser.email}",
          password:"falsePassword",
        }) {
          ok
          error
          token
        }
      }`;

      const { status, body } = await publicTest(query);
      const { ok, error, token } = body.data.login;

      expect(status).toBe(200);
      expect(ok).toBe(false);
      expect(error).toEqual(expect.any(String));
      expect(token).toBeNull();
    });
  });

  describe("userProfile", () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });

    it("should see a user's profile", async () => {
      const query = `
        {
          userProfile(userId:${userId}) {
            ok
            error
            user {
              id
            }
          }
        }`;

      const { status, body } = await privateTest(query);
      const { ok, error, user } = body.data.userProfile;

      expect(status).toBe(200);
      expect(ok).toBe(true);
      expect(error).toBeNull();
      expect(user.id).toEqual(userId);
    });

    it("should not find a profile", async () => {
      const query = `
        {
          userProfile(userId:1557) {
            ok
            error
            user {
              id
            }
          }
        }`;

      const { status, body } = await privateTest(query);
      const { ok, error, user } = body.data.userProfile;

      expect(status).toBe(200);
      expect(ok).toBe(false);
      expect(error).toEqual(expect.any(String));
      expect(user).toBe(null);
    });
  });

  describe("me", () => {
    it("should find my profile", async () => {
      const query = `
        {
          me {
            email
          }
        }`;

      const { status, body } = await privateTest(query);
      const { email } = body.data.me;

      expect(status).toBe(200);
      expect(email).toEqual(testUser.email);
    });

    it("should not allow logged out user", async () => {
      const query = `
        {
          me {
            email
          }
        }`;

      const { status, body } = await publicTest(query);
      expect(status).toBe(200);
      expect(body.errors[0].message).toBe("Forbidden resource");
    });
  });

  describe("editProfile", () => {
    const NEW_EMAIL = "newmail.@testmail.com";

    it("should change email", async () => {
      const query = `
        mutation {
          editProfile(input: {
            email: "${NEW_EMAIL}",
          }) {
            ok
            error
          }
        }`;

      const { status, body } = await privateTest(query);
      const { ok, error } = body.data.editProfile;

      expect(status).toBe(200);
      expect(ok).toBe(true);
      expect(error).toBeNull();
    });

    it("should have new email", async () => {
      const query = `
        {
          me {
            email
          }
        }`;
      const { body: meBody } = await privateTest(query);
      const { email } = meBody.data.me;
      expect(email).toEqual(NEW_EMAIL);
    });
  });

  describe("verifyEmail", () => {
    let verificationCode: string;

    beforeAll(async () => {
      const [verification] = await verificationRepository.find();
      verificationCode = verification.code;
    });

    it("should verify email", async () => {
      const query = `
        mutation {
          verifyEmail(input:{
            code: "${verificationCode}"
          }) {
            ok
            error
          }
        }`;

      const { status, body } = await publicTest(query);
      const { ok, error } = body.data.verifyEmail;

      expect(status).toBe(200);
      expect(ok).toBe(true);
      expect(error).toBeNull();
    });

    it("should fail on verification code not found", async () => {
      const query = `
        mutation {
          verifyEmail(input:{
            code: "wrong-code"
          }) {
            ok
            error
          }
        }`;

      const { status, body } = await publicTest(query);
      const { ok, error } = body.data.verifyEmail;

      expect(status).toBe(200);
      expect(ok).toBe(false);
      expect(error).toEqual(expect.any(String));
    });
  });
});
