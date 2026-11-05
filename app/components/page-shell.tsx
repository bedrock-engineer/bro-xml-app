import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

type PageShellProps = PropsWithChildren<{
  /** Tailwind max-width of the main column. */
  width?: "2xl" | "3xl";
}>;

const mainWidth = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
} as const;

/**
 * Header, centered main column and disclaimer footer shared by the
 * secondary pages (info, feedback). The home page has its own layout.
 */
export function PageShell({ width = "2xl", children }: PageShellProps) {
  const { t } = useTranslation();

  return (
    <div className="pancake">
      <header className="mb-6 border-b border-gray-300 py-4 px-2">
        <div
          style={{ maxWidth: "clamp(360px, 100%, 1800px)" }}
          className="mx-auto"
        >
          <Link
            to="/"
            className="text-2xl flex gap-2 items-center hover:opacity-80"
          >
            <img src="/bedrock.svg" width={30} alt="Bedrock.engineer logo" />{" "}
            {t("appTitle")}
          </Link>
        </div>
      </header>

      <main className={`${mainWidth[width]} mx-auto px-4 py-8`}>
        {children}
      </main>

      <footer className="mt-8 py-6 border-t border-gray-300 text-center text-sm text-gray-500">
        <p>{t("disclaimer")}</p>
      </footer>
    </div>
  );
}
