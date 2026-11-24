import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
export const badgeVariants = cva("inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", { variants: { variant: { default: "border-transparent bg-primary text-primary-foreground", secondary: "border-transparent bg-muted text-foreground", outline: "border-border text-foreground" } }, defaultVariants: { variant: "default" } });
export function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
