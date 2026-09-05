import { Component, type ReactNode } from "react";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      error:
        error instanceof Error
          ? error
          : new Error("An unexpected application error occurred."),
    };
  }

  private reset = () => {
    this.props.onReset();
    this.setState({ error: null });
  };

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="mx-auto flex min-h-svh w-full max-w-xl items-center px-6 py-12">
        <section
          aria-labelledby="fatal-error-heading"
          className="w-full rounded-2xl border border-border bg-card p-6 text-card-foreground"
        >
          <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangleIcon aria-hidden="true" className="size-5" />
          </div>
          <h1 id="fatal-error-heading" className="text-lg font-semibold">
            The workspace needs to be reset
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            An unexpected local application error occurred. Resetting disposes
            the active package and returns to the package picker.
          </p>
          <Button className="mt-5" onClick={this.reset}>
            <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />
            Reset workspace
          </Button>
        </section>
      </main>
    );
  }
}
