import { Test } from "@nestjs/testing";
import { MailService } from "./mail.service";
import got from "got";

class MockFormData {
  append() {}
}
jest.mock("form-data", () => {
  return jest.fn().mockImplementation(() => new MockFormData());
});
jest.mock("got");

const TEST_DOMAIN = "test-domain";

describe("MailService", () => {
  let service: MailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: "CONFIG_OPTIONS",
          useValue: {
            apiKey: "test-apiKey",
            domain: TEST_DOMAIN,
            fromEmail: "test-fromEmail",
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendVerificationEmail", () => {
    it("should call sendEmail", () => {
      const sendVerificationEmailArgs = {
        email: "email",
        code: "code",
      };

      // eslint-disable-next-line @typescript-eslint/require-await
      jest.spyOn(service, "sendEmail").mockImplementation(async () => true);

      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );

      expect(service.sendEmail).toHaveBeenCalledTimes(1);
      expect(service.sendEmail).toHaveBeenCalledWith(
        "Verify you email",
        "verify-email",
        [
          { key: "code", value: sendVerificationEmailArgs.code },
          { key: "username", value: sendVerificationEmailArgs.email },
        ],
      );
    });
  });

  describe("sendEmail", () => {
    it("sends email", async () => {
      const formSpy = jest.spyOn(MockFormData.prototype, "append");
      const ok = await service.sendEmail("", "", [{ key: "one", value: "1" }]);

      expect(formSpy).toHaveBeenCalled();

      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object),
      );

      expect(ok).toEqual(true);
    });

    it("fails on error", async () => {
      jest.spyOn(got, "post").mockImplementation(() => {
        throw new Error("Error");
      });

      const ok = await service.sendEmail("", "", [{ key: "one", value: "1" }]);
      expect(ok).toEqual(false);
    });
  });
});
