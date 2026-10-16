import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ==========================================
// 1. USERS TABLE
// ==========================================
export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    username: text('username').notNull().unique(), // NISN untuk siswa, atau username untuk guru
    password_hash: text('password_hash').notNull(),
    role: text('role', { enum: ['guru', 'siswa'] })
      .notNull()
      .default('siswa'),
    grade_level: integer('grade_level'), // 4, 5, atau 6 (null jika guru)
    class_name: text('class_name'), // e.g. '4A', '5B', '6C'
    gender: text('gender', { enum: ['L', 'P'] }),
    avatar_url: text('avatar_url'),
    is_active: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),
    created_at: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updated_at: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('users_username_idx').on(table.username),
  ]
);

// ==========================================
// 2. SESSIONS / AUTH TOKENS TABLE
// ==========================================
export const sessions = sqliteTable('sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  session_token: text('session_token').notNull().unique(),
  user_id: text('user_id').notNull(), // Id di users atau 'superadmin'
  role: text('role', { enum: ['superadmin', 'guru', 'siswa'] }).notNull(),
  user_data: text('user_data'), // JSON snapshot (name, username, grade_level)
  expires_at: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ==========================================
// 3. DEVICE STATIONS (Laptop Lab Komputer)
// ==========================================
export const deviceStations = sqliteTable('device_stations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  station_number: text('station_number').notNull().unique(), // e.g. 'Laptop 01' - 'Laptop 20'
  device_name: text('device_name'), // e.g. 'Lenovo ThinkPad E14', 'Asus VivoBook'
  status: text('status', {
    enum: ['available', 'occupied', 'maintenance', 'broken'],
  })
    .notNull()
    .default('available'),
  assigned_notes: text('assigned_notes'), // Catatan posisi/kondisi meja
  current_user_id: text('current_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  created_at: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ==========================================
// 4. MEETINGS (Pertemuan Ekstrakurikuler Dinamis)
// ==========================================
export const meetings = sqliteTable('meetings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  meeting_number: integer('meeting_number').notNull().default(1), // Nomor pertemuan dinamis
  grade_level: integer('grade_level'), // 4, 5, 6 atau null jika semua kelas
  title: text('title').notNull(), // misal: 'Pertemuan 1 - Pengenalan Mouse & Keyboard'
  description: text('description'),
  date: text('date').notNull(), // Format YYYY-MM-DD
  start_time: text('start_time').notNull().default('12:30'),
  end_time: text('end_time').notNull().default('14:00'),
  is_open: integer('is_open', { mode: 'boolean' })
    .notNull()
    .default(false), // Toggle manual admin untuk override jadwal
  is_active: integer('is_active', { mode: 'boolean' })
    .notNull()
    .default(false), // Status pertemuan aktif
  attendance_token: text('attendance_token'), // token presensi opsional
  created_at: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ==========================================
// 5. ATTENDANCE (Presensi Kehadiran Siswa Simpel)
// ==========================================
export const attendance = sqliteTable('attendance', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  meeting_id: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  user_id: text('user_id').references(() => users.id, {
    onDelete: 'set null',
  }), // Opsional jika terdaftar di tabel users
  student_name: text('student_name').notNull().default(''), // Nama siswa (pilihan dropdown / ketik)
  grade_level: integer('grade_level').notNull().default(4), // 4, 5, atau 6
  station_number: text('station_number'), // Opsional laptop slot
  partner_user_id: text('partner_user_id').references(() => users.id, {
    onDelete: 'set null',
  }), // Opsional teman sebangku
  check_in_time: integer('check_in_time', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  checked_in_at: integer('checked_in_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  status: text('status', {
    enum: ['hadir', 'izin', 'sakit', 'alpa'],
  })
    .notNull()
    .default('hadir'),
  notes: text('notes'),
  created_at: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ==========================================
// 6. MATERIALS (Materi Pembelajaran)
// ==========================================
export const materials = sqliteTable('materials', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  meeting_id: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content_markdown: text('content_markdown'),
  file_url: text('file_url'), // Link slide, modul PDF, Canva, atau Google Drive
  file_type: text('file_type', {
    enum: ['pdf', 'doc', 'link', 'video'],
  }).default('link'),
  order_index: integer('order_index').notNull().default(1),
  created_at: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ==========================================
// 7. ASSIGNMENTS (Tugas / Praktik Siswa)
// ==========================================
export const assignments = sqliteTable('assignments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  meeting_id: text('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  instructions: text('instructions'),
  due_date: text('due_date'), // YYYY-MM-DD
  max_score: integer('max_score').notNull().default(100),
  is_group_work: integer('is_group_work', { mode: 'boolean' })
    .notNull()
    .default(false),
  created_at: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ==========================================
// 8. SUBMISSIONS (Pengumpulan Tugas Siswa)
// ==========================================
export const submissions = sqliteTable('submissions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  assignment_id: text('assignment_id')
    .notNull()
    .references(() => assignments.id, { onDelete: 'cascade' }),
  user_id: text('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  student_name: text('student_name').notNull().default(''),
  grade_level: integer('grade_level').default(4),
  partner_user_id: text('partner_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  submission_url: text('submission_url'), // Link file di Google Drive / Scratch / Canva / dll
  submission_text: text('submission_text'),
  submitted_at: integer('submitted_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  status: text('status', {
    enum: ['submitted', 'graded', 'late', 'resubmit'],
  })
    .notNull()
    .default('submitted'),
  score: integer('score'), // Nilai 0 - 100
  feedback: text('feedback'), // Komentar penyemangat dari Guru/Pembina
  graded_by: text('graded_by'),
  graded_at: integer('graded_at', { mode: 'timestamp_ms' }),
});

// ==========================================
// DRIZZLE RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ many, one }) => ({
  attendances: many(attendance, { relationName: 'userAttendances' }),
  partnerAttendances: many(attendance, { relationName: 'partnerAttendances' }),
  submissions: many(submissions, { relationName: 'userSubmissions' }),
  assignedStation: one(deviceStations, {
    fields: [users.id],
    references: [deviceStations.current_user_id],
  }),
}));

export const deviceStationsRelations = relations(deviceStations, ({ one }) => ({
  currentUser: one(users, {
    fields: [deviceStations.current_user_id],
    references: [users.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ many }) => ({
  attendances: many(attendance),
  materials: many(materials),
  assignments: many(assignments),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  meeting: one(meetings, {
    fields: [attendance.meeting_id],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [attendance.user_id],
    references: [users.id],
    relationName: 'userAttendances',
  }),
  partner: one(users, {
    fields: [attendance.partner_user_id],
    references: [users.id],
    relationName: 'partnerAttendances',
  }),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  meeting: one(meetings, {
    fields: [materials.meeting_id],
    references: [meetings.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  meeting: one(meetings, {
    fields: [assignments.meeting_id],
    references: [meetings.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignment_id],
    references: [assignments.id],
  }),
  user: one(users, {
    fields: [submissions.user_id],
    references: [users.id],
    relationName: 'userSubmissions',
  }),
  partner: one(users, {
    fields: [submissions.partner_user_id],
    references: [users.id],
  }),
}));

// Export Types for Application Use
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type DeviceStation = typeof deviceStations.$inferSelect;
export type NewDeviceStation = typeof deviceStations.$inferInsert;

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
