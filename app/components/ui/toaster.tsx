"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 180
  const shown = expanded || !isLong ? text : `${text.slice(0, 180)}...`

  return (
    <button
      type="button"
      onClick={() => {
        if (isLong) setExpanded((value) => !value)
      }}
      className="w-full text-left"
      aria-label={isLong ? "Expand notification message" : "Notification message"}
    >
      <ToastDescription>{shown}</ToastDescription>
    </button>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, errorCode, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {(title || errorCode) && (
                <div className="flex items-center gap-2">
                  {title ? <ToastTitle>{title}</ToastTitle> : null}
                  {errorCode ? (
                    <span className="rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {errorCode}
                    </span>
                  ) : null}
                </div>
              )}
              {typeof description === "string" ? <ExpandableDescription text={description} /> : description ? <ToastDescription>{description}</ToastDescription> : null}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
