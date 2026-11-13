import { emptyProject, type Project } from "./types";
export function sampleProject(): Project {
  const p = emptyProject();
  p.departments = [
    { id: "cs", code: "CS", name: "Computer Science" },
    { id: "se", code: "SE", name: "Software Engineering" },
    { id: "bba", code: "BBA", name: "Business Administration" },
    { id: "psy", code: "PSY", name: "Psychology" },
  ];
  p.subjects = [
    {
      id: "eng",
      code: "ENG-101",
      name: "Functional English",
      combine: true,
      maxCombine: 3,
    },
    {
      id: "math",
      code: "MTH-101",
      name: "Quantitative Reasoning",
      combine: true,
    },
    {
      id: "prog",
      code: "CS-101",
      name: "Programming Fundamentals",
      combine: true,
    },
    { id: "db", code: "CS-301", name: "Database Systems", combine: true },
    {
      id: "psych",
      code: "PSY-101",
      name: "Introduction to Psychology",
      combine: false,
    },
    {
      id: "mgmt",
      code: "BUS-101",
      name: "Principles of Management",
      combine: false,
    },
    {
      id: "lab",
      code: "CS-101L",
      name: "Programming Fundamentals Lab",
      combine: true,
    },
  ];
  p.offerings = [
    ["eng", "cs", 1, 2, "Classroom"],
    ["eng", "se", 1, 2, "Classroom"],
    ["eng", "bba", 1, 2, "Classroom"],
    ["eng", "psy", 1, 2, "Classroom"],
    ["math", "cs", 1, 2, "Classroom"],
    ["math", "se", 1, 2, "Classroom"],
    ["math", "bba", 1, 2, "Classroom"],
    ["prog", "cs", 1, 3, "Classroom"],
    ["prog", "se", 1, 3, "Classroom"],
    ["db", "cs", 3, 3, "Classroom"],
    ["db", "se", 3, 3, "Classroom"],
    ["psych", "psy", 1, 3, "Classroom"],
    ["mgmt", "bba", 1, 3, "Classroom"],
    ["lab", "cs", 1, 1, "Computer lab"],
    ["lab", "se", 1, 1, "Computer lab"],
  ].map(([subjectId, departmentId, semester, weeklyClasses, roomType], i) => ({
    id: `off-${i}`,
    subjectId: subjectId as string,
    departmentId: departmentId as string,
    semester: semester as number,
    weeklyClasses: weeklyClasses as number,
    roomType: roomType as string,
  }));
  p.teachers = [
    {
      id: "t1",
      name: "Dr. Ayesha Khan",
      subjectIds: ["eng"],
      availability: null,
    },
    {
      id: "t2",
      name: "Mr. Ahmed Raza",
      subjectIds: ["eng", "mgmt"],
      availability: null,
    },
    {
      id: "t3",
      name: "Dr. Sara Ali",
      subjectIds: ["math"],
      availability: null,
    },
    {
      id: "t4",
      name: "Mr. Hassan Malik",
      subjectIds: ["prog", "db", "lab"],
      availability: null,
    },
    {
      id: "t5",
      name: "Ms. Fatima Noor",
      subjectIds: ["psych"],
      availability: null,
    },
    {
      id: "t6",
      name: "Dr. Usman Shah",
      subjectIds: ["prog", "db", "lab"],
      availability: null,
    },
  ];
  p.rooms = [
    { id: "r1", name: "CR-01", type: "Classroom", availability: null },
    { id: "r2", name: "CR-02", type: "Classroom", availability: null },
    { id: "r3", name: "CR-03", type: "Classroom", availability: null },
    {
      id: "r4",
      name: "Computer Lab 1",
      type: "Computer lab",
      availability: null,
    },
  ];
  return p;
}
