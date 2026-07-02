async function downloadCV() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const L = 20;       // left margin
  const R = 190;      // right margin
  const W = R - L;    // usable width
  let y = 20;

  const LINE_H = 6;
  const PAGE_H = 280;

  function checkPage(needed = LINE_H) {
    if (y + needed > PAGE_H) { doc.addPage(); y = 20; }
  }

  function line(text, size = 11, style = "normal", color = [30, 30, 30]) {
    checkPage();
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.setTextColor(...color);
    doc.text(text, L, y);
    y += LINE_H;
  }

  function multiLine(text, size = 11) {
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, W);
    lines.forEach((l) => { checkPage(); doc.text(l, L, y); y += LINE_H; });
  }

  function sectionHeading(title) {
    y += 3;
    checkPage(LINE_H + 2);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(title.toUpperCase(), L, y);
    y += 2;
    doc.setDrawColor(180, 180, 180);
    doc.line(L, y, R, y);
    y += LINE_H;
  }

  function gap(n = 3) { y += n; }

  const c = CONFIG;

  // --- NAME & CONTACT ---
  line(c.name, 16, "bold");
  line(c.tagline, 11, "normal", [80, 80, 80]);
  line(`${c.location}  |  ${c.contact.phone}  |  ${c.contact.email}`, 10);
  line(c.contact.linkedin, 10, "normal", [80, 80, 80]);
  gap();

  // --- SUMMARY ---
  sectionHeading("Summary");
  multiLine(c.about);

  // --- ERP EXPERIENCE ---
  sectionHeading("ERP Experience");
  c.erpExperience.forEach((e) => line(`${e.system} — ${e.duration}`));

  // --- WORK EXPERIENCE ---
  sectionHeading("Work Experience");
  c.experience.forEach((exp) => {
    line(`${exp.title}`, 11, "bold");
    line(`${exp.company}  |  ${exp.period}`, 10, "normal", [80, 80, 80]);
    gap(2);
    exp.points.forEach((p) => multiLine(`- ${p}`));
    line(`Skills: ${exp.skills.join(", ")}`, 10, "italic", [100, 100, 100]);
    gap(4);
  });

  // --- SKILLS ---
  sectionHeading("Skills");
  const skillText = c.skills.map((s) => `${s.name} (since ${s.since})`).join("   |   ");
  multiLine(skillText);

  // --- EDUCATION ---
  sectionHeading("Education");
  c.education.forEach((edu) => {
    line(edu.degree, 11, "bold");
    line(edu.institution, 11);
    line(`${edu.grade}  |  ${edu.period}`, 10, "normal", [80, 80, 80]);
    if (edu.activities?.length) {
      gap(2);
      edu.activities.forEach((a) => multiLine(`- ${a}`));
    }
    gap(4);
  });

  // --- PROJECTS ---
  if (c.projects?.length) {
    sectionHeading("Projects");
    c.projects.forEach((p) => {
      line(p.title, 11, "bold");
      multiLine(p.description);
      line(`Tech: ${p.tech.join(", ")}`, 10, "italic", [100, 100, 100]);
      if (p.link) line(p.link, 10, "normal", [80, 80, 80]);
      gap(4);
    });
  }

  doc.save("Muhammad-Hafiz-CV.pdf");
  await logDownload();
}

async function logDownload() {
  await fetch(`${SUPABASE_URL}/rest/v1/cv_downloads`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_agent: navigator.userAgent,
      referrer: document.referrer || "direct",
    }),
  });
}
