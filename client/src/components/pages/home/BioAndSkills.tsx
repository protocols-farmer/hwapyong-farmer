//src/components/pages/home/BioAndSkills.tsx
import CornerFlourish from "@/components/shared/CornerFlourish";
import { FaGithub, FaLinkedin, FaXTwitter } from "react-icons/fa6";
import Link from "next/dist/client/link";

const bioData = [
  { label: "name :", value: "hwapyong maniragaba edoaurd" },
  { label: "nickname :", value: "protocols_farmer" },
  {
    label: "profession :",
    value: "backend developer ",
  },
  {
    label: "Obsession :",
    value: "nerdy researches and tech related stuff. Also Biology",
  },
  { label: "location :", value: "unknown" },
  { label: "contact :", value: "Contact me", isContact: true },
  {
    label: "distro :",
    value: "i use fedora & ubuntu, i tried arch and i love debian",
  },

  {
    label: "characters :",
    value: "introverted bro... actually it depends",
  },
  {
    label: "special :",
    value: "chatting with her the one and only... YEMI ",
  },
];

const languageData = [
  {
    label: "languages :",
    value:
      "Golang, Javascript, C (for fun), Rust (for fun and optimizing some code)",
  },
  {
    label: "database :",
    value: "SQL (postgresSQL and SQLite), mongoDB (for fun)",
  },
];

const devOpsData = [
  { label: "containers :", value: "docker, kubernetes" },
  { label: "infrastructure :", value: "terraform, ansible" },
  { label: "cloud & network :", value: "aws, gcp, cloudflare" },
  { label: "vcs / platforms :", value: "git, github and gitlab" },
  {
    label: " monitoring :",
    value: " Prometheus (and PromQL), Grafana",
  },
];

const frontendData = [
  { label: "core :", value: "html, css, js" },
  {
    label: "frameworks & libraries :",
    value: "react, nextjs, tailwind and redux",
  },
];

const socialLinks = [
  {
    label: "github",
    href: "https://github.com/protocols-farmer",
    icon: FaGithub,
  },
  {
    label: "linkedin",
    href: "https://www.linkedin.com/in/hwapyong-maniragaba-edouard-415961344/[[",
    icon: FaLinkedin,
  },
  {
    label: "twitter",
    href: "https://x.com/protocolsfarmer",
    icon: FaXTwitter,
  },
];

function BioAndSkills() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="relative border-3 border-double  p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
          Who am i ? :
        </h4>

        <div className=" border-l-3 border-double pl-3 flex flex-col gap-3">
          {bioData.map((item, index) => (
            <p key={index} className="text-sm font-bold">
              <span className="text-primary">{item.label}</span>
              <span>
                {" "}
                {item.isContact ? (
                  <span>
                    {" "}
                    click here{" "}
                    <Link href="/contact" className="underline  text-primary ">
                      {item.value}
                    </Link>
                  </span>
                ) : (
                  item.value
                )}
              </span>
            </p>
          ))}
        </div>

        <div className="flex gap-4 pt-2 pl-3">
          {socialLinks.map((link, index) => {
            const Icon = link.icon;
            return (
              <Link
                key={index}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors duration-200"
                aria-label={link.label}
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-6">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <div className="flex flex-col gap-3">
          <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
            languages :
          </h4>
          <ul className=" border-l-3 border-double pl-3 flex flex-col gap-3">
            {languageData.map((item, index) => (
              <li key={index} className="text-sm font-bold">
                <span className="text-primary">{item.label}</span>{" "}
                <span>{item.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
            DevOps & cloud :
          </h4>

          <ul className=" border-l-3 border-double pl-3 flex flex-col gap-3">
            {devOpsData.map((item, index) => (
              <li key={index} className="text-sm font-bold">
                <span className=" text-primary ">{item.label}</span>{" "}
                <span> {item.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
            Frontend skills :
          </h4>
          <ul className=" border-l-3 border-double pl-3 flex flex-col gap-3">
            {frontendData.map((item, index) => (
              <li key={index} className="text-sm font-bold">
                <span className="text-primary">{item.label}</span>{" "}
                <span>{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default BioAndSkills;
