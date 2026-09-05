import { ArrowUpRightIcon, FolderArchiveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { version } from "../package.json";

export function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Local workspace · v{version}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cloud Arch Icon Browser
        </h1>
      </header>
      <section
        aria-labelledby="package-heading"
        className="rounded-2xl border border-border bg-card p-6 text-card-foreground"
      >
        <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <FolderArchiveIcon aria-hidden="true" className="size-5" />
        </div>
        <h2 id="package-heading" className="text-base font-medium">
          Your icons, on your machine
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A local workspace for the official Microsoft Azure Architecture Icons
          package. Icons are not included. Package browsing is under
          development.
        </p>
        <Button
          className="mt-5"
          nativeButton={false}
          role="link"
          render={
            <a
              href="https://learn.microsoft.com/en-us/azure/architecture/icons/"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          Get official icons
          <ArrowUpRightIcon aria-hidden="true" data-icon="inline-end" />
          <span className="sr-only"> (opens in a new tab)</span>
        </Button>
      </section>
      <footer className="text-xs leading-5 text-muted-foreground">
        Independent open-source project. Not affiliated with, endorsed by, or
        sponsored by Microsoft.
      </footer>
    </main>
  );
}
