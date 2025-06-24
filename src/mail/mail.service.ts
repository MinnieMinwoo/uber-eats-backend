import got from "got";
import FormData from "form-data";
import { Inject, Injectable } from "@nestjs/common";
import { CONFIG_OPTIONS } from "src/common/common.constants";
import { EmailVar, MailModuleOptions } from "./mail.interfaces";

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  private async sendEmail(
    subject: string,
    template: string,
    emailVars: EmailVar[],
  ) {
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
      await got(`https://api.mailgun.net/v3/${this.options.domain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.options.apiKey}`).toString("base64")}`,
        },
        body: form,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.sendEmail("Verify you email", "verify-email", [
      { key: "code", value: code },
      { key: "username", value: email },
    ]);
  }
}
