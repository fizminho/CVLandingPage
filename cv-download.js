async function downloadCV() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const LEFT = 20;
  const RIGHT = 190;
  const WIDTH = RIGHT - LEFT;
  const PAGE_BOTTOM = 280;
  const LINE_HEIGHT = 5.5;
  let y = 20;

  function ensureSpace(height = LINE_HEIGHT) {
    if (y + height > PAGE_BOTTOM) {
      doc.addPage();
      y = 20;
    }
  }

  function writeText(value, options = {}) {
    const {
      size = 10,
      style = "normal",
      color = [35, 35, 35],
      indent = 0,
      gapAfter = 0,
    } = options;
    const text = String(value ?? "").trim();
    if (!text) return;

    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, WIDTH - indent);
    lines.forEach((wrappedLine) => {
      ensureSpace(LINE_HEIGHT);
      doc.text(wrappedLine, LEFT + indent, y);
      y += LINE_HEIGHT;
    });
    y += gapAfter;
  }

  function heading(title) {
    y += 2;
    ensureSpace(LINE_HEIGHT + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(25, 25, 25);
    doc.text(title.toUpperCase(), LEFT, y);
    y += 2;
    doc.setDrawColor(175, 175, 175);
    doc.line(LEFT, y, RIGHT, y);
    y += LINE_HEIGHT;
  }

  function bullet(text) {
    writeText(`- ${text}`, { indent: 1, gapAfter: 0.5 });
  }

  const c = CONFIG;

  // Contact details are optional and are only printed when configured.
  writeText(c.name, { size: 16, style: "bold", gapAfter: 1 });
  writeText(c.tagline, { size: 11, color: [75, 75, 75] });
  const contactDetails = [
    c.location,
    c.contact?.phone,
    c.contact?.email,
    c.contact?.linkedin,
  ].filter((value) => typeof value === "string" && value.trim());
  if (contactDetails.length) {
    writeText(contactDetails.join(" | "), { size: 9, color: [75, 75, 75] });
  }
  if (c.preferredposition) {
    writeText(`Target Roles: ${c.preferredposition}`, { size: 9, color: [75, 75, 75] });
  }

  heading("Professional Summary");
  writeText(c.about, { size: 10, gapAfter: 1 });

  // Keep achievements in the downloadable CV, not only on the web page.
  if (c.achievements?.length) {
    heading("Selected Project Achievements");
    c.achievements.forEach((item) => {
      writeText(item.title, { size: 10, style: "bold", gapAfter: 0 });
      if (item.scale) {
        writeText(item.scale, { size: 9, style: "italic", color: [75, 75, 75], gapAfter: 0 });
      }
      writeText(item.description, { size: 9.5, gapAfter: 2 });
    });
  }

  heading("Professional Experience");
  c.experience?.forEach((exp) => {
    writeText(exp.title, { size: 10, style: "bold", gapAfter: 0 });
    writeText(`${exp.company} | ${exp.period}`, { size: 9, color: [75, 75, 75], gapAfter: 1 });
    exp.points?.forEach(bullet);
    if (exp.skills?.length) {
      writeText(`Technologies: ${exp.skills.join(", ")}`, {
        size: 9,
        style: "italic",
        color: [90, 90, 90],
        gapAfter: 2,
      });
    }
  });

  if (c.skills?.length || c.previousskills?.length) {
    heading("Technical Skills");
    if (c.skills?.length) {
      writeText(c.skills.map((skill) => skill.name).join(", "), { size: 9.5 });
    }
    if (c.previousskills?.length) {
      writeText(`Additional: ${c.previousskills.map((skill) => skill.name).join(", ")}`, {
        size: 9.5,
      });
    }
  }

  if (c.competencies?.length) {
    heading("Core Competencies");
    // A single linear list is easier for ATS parsers than a multi-column layout.
    c.competencies.forEach((item) => bullet(item.name));
  }

  if (c.erpExperience?.length) {
    heading("ERP Experience");
    c.erpExperience.forEach((item) => {
      writeText(`${item.system} | ${item.duration}`, { size: 9.5 });
    });
  }

  if (c.education?.length) {
    heading("Education");
    c.education.forEach((edu) => {
      writeText(edu.degree, { size: 10, style: "bold", gapAfter: 0 });
      writeText(edu.institution, { size: 9.5, gapAfter: 0 });
      writeText(`${edu.grade} | ${edu.period}`, { size: 9, color: [75, 75, 75] });
      edu.activities?.forEach(bullet);
      y += 2;
    });
  }

  if (c.projects?.length) {
    heading("Additional Projects");
    c.projects.forEach((project) => {
      writeText(project.title, { size: 10, style: "bold", gapAfter: 0 });
      writeText(project.description, { size: 9.5, gapAfter: 0 });
      if (project.tech?.length) {
        writeText(`Technologies: ${project.tech.join(", ")}`, {
          size: 9,
          style: "italic",
          color: [90, 90, 90],
        });
      }
      if (project.link) writeText(project.link, { size: 9, color: [75, 75, 75] });
      y += 2;
    });
  }

  if (c.languages?.length) {
    heading("Languages");
    writeText(c.languages.map((language) => `${language.name} - ${language.proficiency}`).join("; "), {
      size: 9.5,
    });
  }

  // Record the download before triggering the browser's file-save flow.
  // Audit failures are intentionally non-blocking so the CV remains downloadable.
  await logDownload();
  doc.save("Muhammad-Hafiz-CV.pdf");
}

async function logDownload() {
  try {
    const sessionResponse = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({}),
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
    });

    if (!sessionResponse.ok) {
      console.warn("[cv-download] Session creation failed:", sessionResponse.status);
      return false;
    }

    const logResponse = await fetch("/api/log/download", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({}),
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
    });

    if (!logResponse.ok) {
      console.warn("[cv-download] D1 download log rejected:", logResponse.status);
      return false;
    }

    return true;
  } catch (error) {
    // Download must remain available even when analytics or the database is unavailable.
    console.warn("[cv-download] D1 logging request failed:", error);
    return false;
  }
}
