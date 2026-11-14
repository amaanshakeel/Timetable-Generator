export type Availability = string[] | null;
export interface Slot {
  id: string;
  start: string;
  end: string;
  isBreak: boolean;
}
export interface Settings {
  university: string;
  term: string;
  semesterCount: number;
  days: string[];
  slots: Slot[];
  maxCombine: number;
  roomTypes: string[];
}
export interface Department {
  id: string;
  name: string;
  code: string;
  semesters?: number[];
}
export interface Subject {
  id: string;
  code: string;
  name: string;
  combine: boolean;
  maxCombine?: number;
}
export interface Offering {
  id: string;
  subjectId: string;
  departmentId: string;
  semester: number;
  weeklyClasses: number;
  roomType: string;
}
export interface Teacher {
  id: string;
  name: string;
  subjectIds: string[];
  availability: Availability;
}
export interface Room {
  id: string;
  name: string;
  type: string;
  availability: Availability;
}
export interface TeachingGroup {
  id: string;
  subjectId: string;
  offeringIds: string[];
  weeklyClasses: number;
  roomType: string;
}
export interface Session {
  id: string;
  teachingGroupId: string;
  teacherId: string;
  roomId: string;
  dayId: string;
  slotId: string;
  note: string;
  locked: boolean;
}
export interface Project {
  id: string;
  schemaVersion: 1;
  revision: number;
  savedAt: string;
  settings: Settings;
  departments: Department[];
  subjects: Subject[];
  offerings: Offering[];
  teachers: Teacher[];
  rooms: Room[];
  teachingGroups: TeachingGroup[];
  sessions: Session[];
  activeTimetableId?: string;
  timetableName?: string;
  savedTimetables?: SavedTimetable[];
}
export interface Issue {
  id: string;
  kind: string;
  message: string;
  sessionIds: string[];
  offeringId?: string;
}
export interface TimetableFilter {
  departmentId?: string;
  semester?: number;
}
export interface Placement {
  roomId: string;
  dayId: string;
  slotId: string;
}
export const uid = () => crypto.randomUUID();
export const availabilityKey = (day: string, slot: string) => `${day}|${slot}`;
export const isAvailable = (
  availability: Availability,
  day: string,
  slot: string,
) => availability === null || availability.includes(availabilityKey(day, slot));
export function emptyProject(): Project {
  return {
    id: uid(),
    schemaVersion: 1,
    revision: 0,
    savedAt: new Date().toISOString(),
    settings: {
      university: "University of Rawalpindi",
      term: "Fall 2026",
      semesterCount: 8,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      slots: [
        { id: "p1", start: "08:30", end: "10:00", isBreak: false },
        { id: "p2", start: "10:00", end: "11:30", isBreak: false },
        { id: "p3", start: "11:30", end: "12:30", isBreak: true },
        { id: "p4", start: "12:30", end: "14:00", isBreak: false },
        { id: "p5", start: "14:00", end: "15:30", isBreak: false },
      ],
      maxCombine: 3,
      roomTypes: ["Classroom", "Computer lab", "Pharmacy lab", "Studio"],
    },
    departments: [],
    subjects: [],
    offerings: [],
    teachers: [],
    rooms: [],
    teachingGroups: [],
    sessions: [],
  };
}

// Missing memberships in older backups retain their original university-wide availability.
export function departmentSemesters(
  project: Project,
  department: Department,
): number[] {
  return (
    department.semesters ??
    Array.from({ length: project.settings.semesterCount }, (_, i) => i + 1)
  );
}

export type TimetableData = Pick<
  Project,
  | "settings"
  | "departments"
  | "subjects"
  | "offerings"
  | "teachers"
  | "rooms"
  | "teachingGroups"
  | "sessions"
>;
export interface SavedTimetable extends TimetableData {
  id: string;
  name: string;
}
