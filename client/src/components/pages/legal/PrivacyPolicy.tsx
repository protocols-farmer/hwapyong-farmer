//src/components/pages/legal/PrivacyPolicy.tsx

import CornerFlourish from "@/components/shared/CornerFlourish";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <section className="p-3 lg:p-6 min-h-screen border-3 border-double flex flex-col gap-6">
      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h1 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
          Privacy Policy
        </h1>
        <div className="border-l-3 border-double pl-3">
          <p className=" font-bold">Last updated: May 2026</p>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          Overview
        </h4>

        <div className="border-l-3 border-double pl-3">
          <p className="text-sm">
            This is a personal portfolio and blog. I don't sell data, I don't
            run ads, and I don't use third-party trackers. This page exists
            because every website should have one.
          </p>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          What I Collect
        </h4>

        <div className="border-l-3 border-double pl-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-primary font-bold text-sm">
              Authentication Data
            </span>
            <p className="text-sm">
              When you log in as the site owner, I store a hashed password and
              session token. This is purely for security. Only one account
              exists — mine.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-primary font-bold text-sm">Nothing Else</span>
            <p className="text-sm">
              No analytics. No cookies for visitors. No email collection. No
              contact forms storing data on my server. You visit, you leave.
              That's it.
            </p>
          </div>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          Third Parties
        </h4>

        <div className="border-l-3 border-double pl-3">
          <p className="text-sm">
            I use Cloudinary for image hosting. When you view an image, your
            browser requests it directly from Cloudinary's servers. Their
            privacy policy applies to those requests.
          </p>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          Questions
        </h4>

        <div className="border-l-3 border-double pl-3">
          <p className="text-sm">
            If you have questions about this policy, reach out on{" "}
            <Link href="/contact" className="underline text-primary font-bold">
              my contact page
            </Link>
            . I'll respond when I can.
          </p>
        </div>
      </div>

      <Button
        asChild
        variant="outline"
        className="border-3 border-double rounded-none w-full sm:w-fit"
      >
        <Link href="/">Back Home</Link>
      </Button>
    </section>
  );
}
