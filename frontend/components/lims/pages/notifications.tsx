"use client"

import { useState } from "react"
import { Page } from "@/components/lims/shell"
import { Button, Card } from "@/components/lims/primitives"
import { useNotifications } from "@/lib/lims/hooks"
import { api } from "@/lib/lims/api"
import * as I from "@/components/lims/icons"

export function NotificationsPage() {
  const { data, loading, error, refresh } = useNotifications()
  const [busy, setBusy] = useState(false)

  return (
    <Page
      title="Notifications"
      subtitle="Workflow updates, dispatch events, and report availability"
      right={
        <Button
          variant="secondary"
          disabled={busy || data.length === 0}
          onClick={async () => {
            setBusy(true)
            try {
              await api.notifications.markAllRead()
              await refresh()
            } finally {
              setBusy(false)
            }
          }}
        >
          Mark all read
        </Button>
      }
    >
      {error && (
        <div style={{ padding: 12, marginBottom: 14, borderRadius: 10, background: "#fde4e4", color: "#a93445", border: "1px solid #f6c4c4", fontSize: 13 }}>
          {error}
        </div>
      )}
      {loading && data.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
      ) : data.length === 0 ? (
        <Card padding={48} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          <I.Bell size={30} color="#cbcbd6" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>No notifications yet</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((item) => (
            <Card key={item.id} padding={18} style={{ borderColor: item.read ? "rgba(0,0,0,0.07)" : "rgba(108,103,184,0.35)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {!item.read && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#6c67b8" }} />}
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)" }}>{item.title}</div>
                  </div>
                  {item.body && <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-secondary)" }}>{item.body}</div>}
                  <div style={{ marginTop: 8, fontSize: 11.5, color: "#8e8ea0" }}>{item.type} · {item.createdAt || ""}</div>
                </div>
                {!item.read && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await api.notifications.markRead(item.id)
                      await refresh()
                    }}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}

export default NotificationsPage
