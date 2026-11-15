import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Starting semester migration...");

  const users = await prisma.user.findMany({
    include: {
      terms: true,
      subjects: true,
      projects: true,
    },
  });

  for (const user of users) {
    console.log(`Processing user: ${user.name} (${user.id})`);

    // Check if user already has a Semester 1 term
    let semester1 = user.terms.find((t) => t.name.toLowerCase().includes("semester 1"));

    if (!semester1) {
      // Check if user has an existing term (e.g. "Term 2 - Winter 2026")
      if (user.terms.length > 0) {
        // If there's an existing term, check if it should be renamed or keep it and make Semester 1
        const existing = user.terms[0];
        // Rename existing or set it as Semester 1
        semester1 = await prisma.term.update({
          where: { id: existing.id },
          data: {
            name: "Semester 1",
            order: 1,
            isCurrent: true,
            isArchived: false,
            startDate: existing.startDate || new Date("2025-08-01"),
            endDate: existing.endDate || new Date("2025-12-15"),
          },
        });
        console.log(`Updated existing term to Semester 1: ${semester1.id}`);
      } else {
        semester1 = await prisma.term.create({
          data: {
            userId: user.id,
            name: "Semester 1",
            order: 1,
            isCurrent: true,
            isArchived: false,
            startDate: new Date("2025-08-01"),
            endDate: new Date("2025-12-15"),
          },
        });
        console.log(`Created new Semester 1: ${semester1.id}`);
      }
    } else {
      semester1 = await prisma.term.update({
        where: { id: semester1.id },
        data: {
          order: 1,
          isCurrent: true,
        },
      });
    }

    // Assign all subjects of this user that have null termId to semester1
    const unassignedSubjects = await prisma.subject.findMany({
      where: {
        userId: user.id,
        termId: null,
      },
    });

    if (unassignedSubjects.length > 0) {
      await prisma.subject.updateMany({
        where: {
          userId: user.id,
          termId: null,
        },
        data: {
          termId: semester1.id,
          keepFresh: true,
        },
      });
      console.log(`Assigned ${unassignedSubjects.length} subjects to Semester 1`);
    }

    // Also update any projects that don't have a termId
    const unassignedProjects = await prisma.project.findMany({
      where: {
        userId: user.id,
        termId: null,
      },
    });

    if (unassignedProjects.length > 0) {
      await prisma.project.updateMany({
        where: {
          userId: user.id,
          termId: null,
        },
        data: {
          termId: semester1.id,
        },
      });
      console.log(`Assigned ${unassignedProjects.length} projects to Semester 1`);
    }
  }

  console.log("Semester migration complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
