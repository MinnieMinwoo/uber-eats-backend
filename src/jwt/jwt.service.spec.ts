import { Test } from "@nestjs/testing";
import * as jwt from "jsonwebtoken";
import { JwtService } from "./jwt.service";
import { CONFIG_OPTIONS } from "src/common/common.constants";

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "TOKEN"),
  verify: jest.fn(() => ({ id: USER_ID })),
}));

const TEST_KEY = "testKey";
const USER_ID = 1;

describe("JwtService", () => {
  let service: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: CONFIG_OPTIONS,
          useValue: { privateKey: TEST_KEY },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sign", () => {
    it("should return a signed token", () => {
      const token = service.sign(USER_ID);

      expect(typeof token).toBe("string");
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledWith({ id: USER_ID }, TEST_KEY);
    });
  });

  describe("verify", () => {
    it("should return the decoded token", () => {
      const TOKEN = "TOKEN";
      const decodedToken = service.verify(TOKEN);

      expect(decodedToken).toEqual({ id: USER_ID });
      expect(jwt.verify).toHaveBeenCalledTimes(1);
      expect(jwt.verify).toHaveBeenCalledWith(TOKEN, TEST_KEY);
    });
  });
});
