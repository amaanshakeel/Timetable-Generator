import { emptyProject, type Project } from "../src/domain/types";
export function fixture(): Project {
  const p = emptyProject();
  p.departments = [
    { id: "cs", name: "Computer Science", code: "CS" },
    { id: "se", name: "Software Engineering", code: "SE" },
  ];
  p.subjects = [
    {
      id: "eng",
      code: "ENG101",
      name: "English",
      combine: true,
      maxCombine: 3,
    },
  ];
  p.offerings = [
    {
      id: "o1",
      subjectId: "eng",
      departmentId: "cs",
      semester: 1,
      weeklyClasses: 2,
      roomType: "Classroom",
    },
    {
      id: "o2",
      subjectId: "eng",
      departmentId: "se",
      semester: 1,
      weeklyClasses: 2,
      roomType: "Classroom",
    },
  ];
  p.teachers = [
    { id: "t1", name: "Teacher One", subjectIds: ["eng"], availability: null },
  ];
  p.rooms = [
    { id: "r1", name: "CR-01", type: "Classroom", availability: null },
    { id: "r2", name: "CR-02", type: "Classroom", availability: null },
  ];
  p.teachingGroups = [
    {
      id: "g1",
      subjectId: "eng",
      offeringIds: ["o1", "o2"],
      weeklyClasses: 2,
      roomType: "Classroom",
    },
  ];
  p.sessions = [
    {
      id: "s1",
      teachingGroupId: "g1",
      teacherId: "t1",
      roomId: "r1",
      dayId: "Mon",
      slotId: "p1",
      note: "2-hour lab",
      locked: false,
    },
    {
      id: "s2",
      teachingGroupId: "g1",
      teacherId: "t1",
      roomId: "r2",
      dayId: "Tue",
      slotId: "p1",
      note: "",
      locked: false,
    },
  ];
  return p;
}
