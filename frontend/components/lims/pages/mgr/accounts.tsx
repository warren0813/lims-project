"use client"

import { useMemo, useState } from "react"
import { Page } from "@/components/lims/shell"
import { Button, Card, FieldLabel, SelectInput, TextInput } from "@/components/lims/primitives"
import { useUsers } from "@/lib/lims/hooks"
import { api } from "@/lib/lims/api"
import * as I from "@/components/lims/icons"

const roles = ["fab_user", "lab_user", "lab_manager"]

export function MgrAccounts() {
  const { data: users, loading, error, refresh } = useUsers()
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "fab_user",
    department: "",
  })

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const search = query.trim().toLowerCase()
      const matchesSearch = !search || user.username.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)
      return matchesRole && matchesSearch
    })
  }, [users, query, roleFilter])

  const createUser = async () => {
    setCreating(true)
    try {
      await api.users.create({
        username: form.username,
        email: form.email,
        password: form.password || "ChangeMe123!",
        role: form.role,
        department: form.department,
      })
      setForm({ username: "", email: "", password: "", role: "fab_user", department: "" })
      await refresh()
    } finally {
      setCreating(false)
    }
  }

  return (
    <Page title="Accounts" subtitle="Manage users, roles, departments, and account state">
      {error && <div style={{ padding: 12, marginBottom: 14, borderRadius: 10, background: "#fde4e4", color: "#a93445", border: "1px solid #f6c4c4", fontSize: 13 }}>{error}</div>}

      <Card padding={20} style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <FieldLabel>Username</FieldLabel>
            <TextInput value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Department</FieldLabel>
            <TextInput value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <Button variant="dark" disabled={creating || !form.username.trim()} icon={<I.Plus size={14} />} onClick={createUser}>Create</Button>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <TextInput placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
        <SelectInput value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="all">All roles</option>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </SelectInput>
      </div>

      {loading && filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((user) => (
            <Card key={user.id} padding={16}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 14, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{user.username}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{user.email || "No email"}</div>
                </div>
                <SelectInput
                  value={user.role}
                  onChange={async (e) => {
                    await api.users.update(user.id, { role: e.target.value })
                    await refresh()
                  }}
                >
                  {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                </SelectInput>
                <TextInput
                  value={user.department}
                  placeholder="Department"
                  onChange={async (e) => {
                    await api.users.update(user.id, { department: e.target.value })
                    await refresh()
                  }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button
                    variant={user.isActive ? "secondary" : "dark"}
                    size="sm"
                    onClick={async () => {
                      await api.users.update(user.id, { is_active: !user.isActive })
                      await refresh()
                    }}
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const res = await api.users.resetPassword(user.id)
                      alert(res.detail)
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}

export default MgrAccounts
