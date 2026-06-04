import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { parseDate, formatDisplayDate, countNights } from '../lib/bookingRules'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const ROLE_LABEL = { admin: 'Admin', priority_guest: 'Priority Guest', regular_guest: 'Regular Guest' }
const ROLE_VARIANT = { admin: 'admin', priority_guest: 'priority', regular_guest: 'regular' }
const STATUS_VARIANT = { pending: 'pending', approved: 'approved', rejected: 'rejected' }

function BookingCard({ booking, onApprove, onReject, onDelete }) {
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes || '')
  const checkIn  = parseDate(booking.check_in)
  const checkOut = parseDate(booking.check_out)
  const nights   = countNights(checkIn, checkOut)
  const guestName = booking.profiles?.full_name || booking.profiles?.email || 'Unknown guest'

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge variant={STATUS_VARIANT[booking.status]}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
              {booking.profiles?.role && (
                <Badge variant={ROLE_VARIANT[booking.profiles.role]}>
                  {ROLE_LABEL[booking.profiles.role]}
                </Badge>
              )}
              {booking.admin_override && <Badge variant="admin">Override</Badge>}
            </div>
            <p className="font-semibold text-slate-800">{guestName}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatDisplayDate(checkIn)} → {formatDisplayDate(checkOut)}
              <span className="mx-1.5 text-slate-300">·</span>
              {nights} night{nights !== 1 ? 's' : ''}
            </p>
            {booking.notes && (
              <p className="text-sm text-slate-400 mt-1.5 italic">"{booking.notes}"</p>
            )}
            {booking.admin_notes && booking.status !== 'pending' && (
              <p className="text-sm text-sea-600 mt-1.5">
                <span className="font-medium">Note:</span> {booking.admin_notes}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {booking.status === 'pending' && (
              <>
                <Textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Optional note to guest…"
                  rows={2}
                  className="w-44 text-xs"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => onApprove(booking.id, adminNotes)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onReject(booking.id, adminNotes)}
                    className="text-xs">
                    Reject
                  </Button>
                </div>
              </>
            )}
            <Button size="sm" variant="ghost"
              onClick={() => onDelete(booking.id)}
              className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 text-xs">
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const [bookings, setBookings]         = useState([])
  const [users, setUsers]               = useState([])
  const [blockedDates, setBlockedDates] = useState([])
  const [loading, setLoading]           = useState(true)
  const [newBlock, setNewBlock]         = useState({ start_date: '', end_date: '', reason: '' })

  async function fetchAll() {
    const [bookingsRes, usersRes, blockedRes] = await Promise.all([
      supabase.from('bookings').select('*, profiles(full_name, email, role)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('blocked_dates').select('*').order('start_date'),
    ])
    if (bookingsRes.data) setBookings(bookingsRes.data)
    if (usersRes.data)    setUsers(usersRes.data)
    if (blockedRes.data)  setBlockedDates(blockedRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function updateBookingStatus(id, status, notes) {
    await supabase.from('bookings').update({ status, admin_notes: notes || null }).eq('id', id)
    fetchAll()
  }

  async function deleteBooking(id) {
    if (!confirm('Permanently delete this booking?')) return
    await supabase.from('bookings').delete().eq('id', id)
    fetchAll()
  }

  async function updateUserRole(userId, role) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    fetchAll()
  }

  async function addBlockedDates() {
    if (!newBlock.start_date || !newBlock.end_date) return
    await supabase.from('blocked_dates').insert({
      start_date: newBlock.start_date,
      end_date: newBlock.end_date,
      reason: newBlock.reason.trim() || null,
      created_by: user.id,
    })
    setNewBlock({ start_date: '', end_date: '', reason: '' })
    fetchAll()
  }

  async function deleteBlockedDate(id) {
    await supabase.from('blocked_dates').delete().eq('id', id)
    fetchAll()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pending = bookings.filter(b => b.status === 'pending')
  const history = bookings.filter(b => b.status !== 'pending')

  const upcomingItems = [
    ...bookings.filter(b => b.status === 'approved' && parseDate(b.check_out) >= today)
      .map(b => ({ type: 'booking', date: parseDate(b.check_in), data: b })),
    ...blockedDates.filter(b => parseDate(b.end_date) >= today)
      .map(b => ({ type: 'blocked', date: parseDate(b.start_date), data: b })),
  ].sort((a, b) => a.date - b.date)

  if (loading) {
    return (
      <div className="min-h-screen bg-sea-50">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sea-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-slate-800 mb-6">Admin Panel</h1>

        <Tabs defaultValue="bookings">
          <TabsList className="mb-6">
            <TabsTrigger value="bookings">
              Bookings
              {pending.length > 0 && (
                <span className="ml-1.5 bg-rose-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Stays</TabsTrigger>
            <TabsTrigger value="blocked">Blocked Dates</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* ── Bookings ── */}
          <TabsContent value="bookings">
            {bookings.length === 0 ? (
              <p className="text-center py-16 text-slate-400 text-sm">No bookings yet.</p>
            ) : (
              <div className="space-y-6">
                {pending.length > 0 && (
                  <section>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Pending Requests
                    </p>
                    <div className="space-y-3">
                      {pending.map(b => (
                        <BookingCard key={b.id} booking={b}
                          onApprove={(id, n) => updateBookingStatus(id, 'approved', n)}
                          onReject={(id, n) => updateBookingStatus(id, 'rejected', n)}
                          onDelete={deleteBooking} />
                      ))}
                    </div>
                  </section>
                )}
                {history.length > 0 && (
                  <section>
                    {pending.length > 0 && <Separator className="mb-6" />}
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">History</p>
                    <div className="space-y-3">
                      {history.map(b => (
                        <BookingCard key={b.id} booking={b}
                          onApprove={(id, n) => updateBookingStatus(id, 'approved', n)}
                          onReject={(id, n) => updateBookingStatus(id, 'rejected', n)}
                          onDelete={deleteBooking} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Upcoming Stays ── */}
          <TabsContent value="upcoming">
            {upcomingItems.length === 0 ? (
              <p className="text-center py-16 text-slate-400 text-sm">Nothing upcoming.</p>
            ) : (
              <div className="space-y-3">
                {upcomingItems.map(({ type, data }) =>
                  type === 'booking' ? (
                    <BookingCard key={`b-${data.id}`} booking={data}
                      onApprove={(id, n) => updateBookingStatus(id, 'approved', n)}
                      onReject={(id, n) => updateBookingStatus(id, 'rejected', n)}
                      onDelete={deleteBooking} />
                  ) : (
                    <Card key={`blk-${data.id}`}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="blocked">Blocked</Badge>
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {formatDisplayDate(parseDate(data.start_date))} → {formatDisplayDate(parseDate(data.end_date))}
                            </p>
                            {data.reason && <p className="text-xs text-slate-400 mt-0.5">{data.reason}</p>}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost"
                          onClick={() => deleteBlockedDate(data.id)}
                          className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 text-xs">
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Blocked Dates ── */}
          <TabsContent value="blocked">
            <Card className="mb-4">
              <CardContent className="p-5">
                <h3 className="font-semibold text-slate-700 mb-4 text-sm">Block a date range</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5">
                    <Label>From</Label>
                    <Input type="date" value={newBlock.start_date}
                      onChange={e => setNewBlock(b => ({ ...b, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>To</Label>
                    <Input type="date" value={newBlock.end_date}
                      onChange={e => setNewBlock(b => ({ ...b, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5 mb-4">
                  <Label>Reason (optional)</Label>
                  <Input value={newBlock.reason}
                    onChange={e => setNewBlock(b => ({ ...b, reason: e.target.value }))}
                    placeholder="e.g. Family gathering, Maintenance…" />
                </div>
                <Button onClick={addBlockedDates} disabled={!newBlock.start_date || !newBlock.end_date}>
                  Block dates
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {blockedDates.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">No blocked dates.</p>
              )}
              {blockedDates.map(b => (
                <Card key={b.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDisplayDate(parseDate(b.start_date))} → {formatDisplayDate(parseDate(b.end_date))}
                      </p>
                      {b.reason && <p className="text-xs text-slate-400 mt-0.5">{b.reason}</p>}
                    </div>
                    <Button size="sm" variant="ghost"
                      onClick={() => deleteBlockedDate(b.id)}
                      className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 text-xs">
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Users ── */}
          <TabsContent value="users">
            <div className="space-y-2">
              {users.map(u => (
                <Card key={u.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate text-sm">{u.full_name || '(no name)'}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <Select
                      value={u.role}
                      onValueChange={role => updateUserRole(u.id, role)}
                      disabled={u.id === user.id}
                    >
                      <SelectTrigger className="w-40 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular_guest">Regular Guest</SelectItem>
                        <SelectItem value="priority_guest">Priority Guest</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
