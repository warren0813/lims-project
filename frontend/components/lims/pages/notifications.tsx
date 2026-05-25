"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Page } from "@/components/lims/shell"
import { Button, Card } from "@/components/lims/primitives"
import { useAuth, useNotifications } from "@/lib/lims/hooks"
import { api, type NotificationRow } from "@/lib/lims/api"
import * as I from "@/components/lims/icons"

const FAB_INBOXES = [
  { id: "approved", label: "Approved Requests", match: (n: NotificationRow) => n.type === "request.approved" },
  { id: "rejected", label: "Rejected Requests", match: (n: NotificationRow) => n.type === "request.rejected" || n.type === "sample.rejected" },
  { id: "received", label: "Sample Received", match: (n: NotificationRow) => n.type === "sample.received" },
  { id: "completed", label: "Request Completed", match: (n: NotificationRow) => n.type === "request.completed" },
]

const MANAGER_INBOXES = [
  { id: "requests", label: "New Requests", match: (n: NotificationRow) => n.type === "request.submitted" },
  { id: "emergency", label: "Emergency Faults", match: (n: NotificationRow) => n.type.includes("fault") || n.type.includes("failed") || n.type.includes("error") },
]

const LAB_INBOXES = [
  { id: "dispatch", label: "Dispatch Updates", match: (n: NotificationRow) => n.type.startsWith("dispatch.") || n.type.startsWith("wip.") },
  { id: "emergency", label: "Emergency Faults", match: (n: NotificationRow) => n.type.includes("fault") || n.type.includes("failed") || n.type.includes("error") },
]

export function NotificationsPage() {
  const { data, loading, error, refresh } = useNotifications()
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const inboxes = inboxesForRole(user?.role)
  const [tab, setTab] = useState(inboxes[0]?.id || "requests")
  const [open, setOpen] = useState<Set<string>>(new Set())
  const router = useRouter()
  const inbox = inboxes.find((item) => item.id === tab) ?? inboxes[0]
  const visible = data.filter(inbox.match)
  const grouped = groupNotifications(visible)

  useEffect(() => {
    if (!inboxes.some((item) => item.id === tab)) {
      setTab(inboxes[0]?.id || "requests")
    }
  }, [inboxes, tab])

  const openRelated = async (item: NotificationRow) => {
    if (!item.read) {
      await api.notifications.markRead(item.id)
      await refresh()
    }
    const href = notificationHref(item, user?.role)
    if (href) router.push(href)
  }

  return (
    <Page
      title="Notifications"
      subtitle="Grouped workflow inboxes for requests, dispatches, and equipment faults"
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {inboxes.map((box) => {
          const active = tab === box.id
          const unread = data.filter((n) => box.match(n) && !n.read).length
          const count = data.filter(box.match).length
          return (
            <button key={box.id} onClick={() => setTab(box.id)} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 12px", borderRadius: 8,
              border: `1px solid ${active ? "#6c67b8" : "rgba(0,0,0,0.08)"}`,
              background: active ? "#ecebf7" : "#fff",
              color: active ? "#4f4a8f" : "var(--text-primary)",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit",
            }}>
              {box.label}
              <span style={{
                minWidth: 20, height: 18, borderRadius: 999,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "0 6px", fontSize: 11,
                background: unread ? "#c0394a" : "#ebebf0",
                color: unread ? "#fff" : "#5a5a6e",
              }}>{unread || count}</span>
            </button>
          )
        })}
      </div>

      {loading && data.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
      ) : visible.length === 0 ? (
        <Card padding={48} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          <I.Bell size={30} color="#cbcbd6" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>No notifications in this inbox</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grouped.map((group) => {
            const isOpen = open.has(group.key)
            const unread = group.items.filter((item) => !item.read).length
            return (
            <Card key={group.key} padding={0} style={{ overflow: "hidden", borderColor: unread ? "rgba(108,103,184,0.35)" : "rgba(0,0,0,0.07)" }}>
              <button onClick={() => setOpen((prev) => {
                const next = new Set(prev)
                if (next.has(group.key)) next.delete(group.key)
                else next.add(group.key)
                return next
              })} style={{
                width: "100%", display: "grid", gridTemplateColumns: "1fr auto 20px",
                gap: 14, alignItems: "center", padding: 18,
                background: "#fff", border: "none", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {unread > 0 && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#6c67b8" }} />}
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--text-primary)" }}>{group.title}</div>
                  </div>
                  <div style={{ marginTop: 5, fontSize: 12, color: "var(--text-secondary)" }}>
                    {group.items.length} update{group.items.length === 1 ? "" : "s"} · {group.latest || ""}
                  </div>
                </div>
                <span style={{
                  minWidth: 24, height: 20, padding: "0 8px", borderRadius: 999,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                  background: unread ? "#c0394a" : "#ebebf0",
                  color: unread ? "#fff" : "#5a5a6e",
                }}>{unread || group.items.length}</span>
                {isOpen ? <I.ChevronDown size={16} color="#8e8ea0" /> : <I.ChevronRight size={16} color="#8e8ea0" />}
              </button>
              {isOpen && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" }}>
                  {group.items.map((item) => (
                    <div key={item.id} style={{
                      display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start",
                      padding: "14px 18px", borderTop: "1px solid rgba(0,0,0,0.05)",
                      background: item.read ? "#fff" : "#fbfbff",
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {!item.read && <span style={{ width: 7, height: 7, borderRadius: 999, background: "#6c67b8" }} />}
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{item.title}</div>
                        </div>
                        {item.body && <div style={{ marginTop: 5, fontSize: 13, color: "var(--text-secondary)" }}>{item.body}</div>}
                        <div style={{ marginTop: 7, fontSize: 11.5, color: "#8e8ea0" }}>{item.type} · {item.createdAt || ""}</div>
                      </div>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        {notificationHref(item, user?.role) && (
                          <Button variant="secondary" size="sm" onClick={() => openRelated(item)}>Open</Button>
                        )}
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
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )})}
        </div>
      )}
    </Page>
  )
}

function inboxesForRole(role?: string) {
  if (role === "fab_user") return FAB_INBOXES
  if (role === "lab_manager") return MANAGER_INBOXES
  return LAB_INBOXES
}

function groupNotifications(items: NotificationRow[]) {
  const map = new Map<string, { key: string; title: string; latest: string; items: NotificationRow[] }>()
  items.forEach((item) => {
    const requestId = item.relatedRequestId || (item.relatedEntityType === "CommissionRequest" ? item.relatedEntityId : "")
    const key = requestId || `${item.type}|${item.relatedEntityType}|${item.relatedEntityId || item.title}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: item.relatedRequestNo || (requestId ? `Request · ${requestId}` : labelForType(item.type)),
        latest: item.createdAt || "",
        items: [],
      })
    }
    const group = map.get(key)!
    group.items.push(item)
    if ((item.createdAt || "") > group.latest) group.latest = item.createdAt || ""
  })
  return Array.from(map.values()).map((group) => ({
    ...group,
    items: group.items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
  }))
}

function labelForType(type: string) {
  if (type.includes("fault") || type.includes("failed")) return "Emergency"
  if (type.startsWith("request.")) return "Request"
  if (type.startsWith("sample.")) return "Sample"
  if (type.startsWith("dispatch.")) return "Dispatch"
  if (type.startsWith("wip.")) return "WIP"
  return "Notification"
}

function notificationHref(item: NotificationRow, role?: string) {
  const entity = item.relatedEntityType
  const id = item.relatedEntityId
  const requestId = item.relatedRequestId || (entity === "CommissionRequest" ? id : "")
  if (!id && !requestId) return ""
  if (entity === "CommissionRequest") {
    if (role === "fab_user") return `/fab/requests/${id}`
    if (role === "lab_manager") return `/manager/requests/${id}`
    return ""
  }
  if (entity === "Sample") {
    if (role === "fab_user" && requestId) return `/fab/requests/${requestId}`
    return role === "lab_manager" ? `/manager/lab/samples/${id}` : `/lab/samples/${id}`
  }
  if (entity === "DispatchJob") return role === "lab_manager" ? `/manager/lab/dispatches/${id}` : `/lab/dispatches/${id}`
  if (entity === "DispatchQueueProposal") return role === "lab_manager" ? "/manager/lab/wip" : "/lab/wip"
  return ""
}

export default NotificationsPage
