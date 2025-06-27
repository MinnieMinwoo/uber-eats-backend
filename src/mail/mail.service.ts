import got from "got";
import FormData from "form-data";
import { Inject, Injectable } from "@nestjs/common";
import { CONFIG_OPTIONS } from "src/common/common.constants";
import type { EmailVar, MailModuleOptions } from "./mail.interfaces";

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  async sendEmail(
    subject: string,
    template: string,
    emailVars: EmailVar[],
  ): Promise<boolean> {
    const form = new FormData();
    form.append(
      "from",
      `Stella from Uber Eats <mailgun@${this.options.domain}>`,
    );
    form.append("to", `stellahoshi0507@gmail.com`);
    form.append("subject", subject);
    form.append("template", template);
    emailVars.forEach(({ key, value }) => {
      form.append(`v:${key}`, value);
    });

    try {
      await got.post(
        `https://api.mailgun.net/v3/${this.options.domain}/messages`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${this.options.apiKey}`).toString("base64")}`,
          },
          body: form,
        },
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.sendEmail("Verify you email", "verify-email", [
      { key: "code", value: code },
      { key: "username", value: email },
    ]);
  }
}
