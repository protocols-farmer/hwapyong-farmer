//src/components/pages/legal/TermsOfService.tsx

import CornerFlourish from "@/components/shared/CornerFlourish";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  return (
    <section className="p-3 lg:p-6 min-h-screen border-3 border-double flex flex-col gap-6">
      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h1 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
          Terms of Service
        </h1>
        <div className="border-l-3 border-double pl-3">
          <p className=" font-bold">Last updated: May 2026</p>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          Acceptance
        </h4>

        <div className="border-l-3 border-double pl-3">
          <p className="text-sm">
            By accessing this website, you agree to these terms. If you don't
            agree, that's fine just close the tab. No hard feelings.
          </p>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          Content
        </h4>

        <div className="border-l-3 border-double pl-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-primary font-bold text-sm">My Content</span>
            <p className="text-sm">
              All articles, code snippets, and project descriptions are my own
              work unless stated otherwise. You can reference them with credit.
              Don't claim them as yours.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-primary font-bold text-sm">Your Content</span>
            <p className="text-sm">
              This site doesn't accept user submissions, comments, or uploads.
              There's nowhere for you to post content. That simplifies things.
            </p>
          </div>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          Disclaimer
        </h4>

        <div className="border-l-3 border-double pl-3">
          <p className="text-sm">
            I write about things I'm learning. Some information might be
            incomplete or become outdated. I'm not responsible for what you do
            with code from this site. Test things yourself. That's what
            developers do.
          </p>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          Changes
        </h4>

        <div className="border-l-3 border-double pl-3">
          <p className="text-sm">
            I may update these terms occasionally. The date at the top tells you
            when they were last changed. Continued use means you accept the
            updates.
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
            Questions about these terms?{" "}
            <Link href="/contact" className="underline text-primary font-bold">
              Contact me
            </Link>
            .
          </p>
        </div>
      </div>

      <Button
        asChild
        variant="outline"
        className="border-3 border-double rounded-none w-full sm:w-fit"
      >
        <Link href="/"> Back Home</Link>
      </Button>
    </section>
  );
}
