"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--honey-light)",
          "--success-text": "var(--honey-dark)",
          "--success-border": "var(--honey)",
          "--error-bg": "var(--popover)",
          "--error-text": "var(--destructive)",
          "--error-border": "var(--destructive)",
          "--warning-bg": "var(--honey-light)",
          "--warning-text": "var(--honey-dark)",
          "--warning-border": "var(--honey)",
          "--info-bg": "var(--popover)",
          "--info-text": "var(--honey-dark)",
          "--info-border": "var(--honey)",
          "--border-radius": "var(--radius)",
          fontFamily: "var(--font-vazirmatn)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          success:
            "!bg-honey-light/40 !text-honey-dark !border-honey/40",
          error:
            "!bg-red-50 !text-red-700 dark:!bg-red-950/40 dark:!text-red-300 !border-red-200 dark:!border-red-900",
          warning:
            "!bg-amber-50 !text-amber-800 dark:!bg-amber-950/40 dark:!text-amber-200 !border-amber-200 dark:!border-amber-900",
          info: "!bg-popover !text-popover-foreground !border-border",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
