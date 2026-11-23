function makeElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function append(parent, tag, className, text) {
  const node = makeElement(tag, className, text);
  parent.appendChild(node);
  return node;
}

function safeExternalLink(label, value, className) {
  if (typeof value !== "string" || !value.trim()) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  const link = makeElement("a", className, label);
  link.href = url.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function sectionShell(id, title) {
  const section = makeElement("section");
  section.id = id;
  append(section, "div", "section-title", title);
  return section;
}

function addTags(parent, values) {
  const wrap = append(parent, "div", "exp-skills");
  (Array.isArray(values) ? values : []).forEach((value) => {
    append(wrap, "span", "skill-tag", value);
  });
  return wrap;
}

const RENDERERS = {
  about() {
    const section = sectionShell("about", "About");
    append(section, "p", "about-text", CONFIG.about);
    if (CONFIG.preferredposition) {
      append(section, "p", "subsection-label", "Preferred Positions");
      const tags = append(section, "div", "skills-grid");
      CONFIG.preferredposition.split(",").forEach((position) => {
        append(tags, "span", "skill-tag", position.trim());
      });
    }
    return section;
  },

  achievements() {
    if (!CONFIG.achievements?.length) return null;
    const section = sectionShell("achievements", "Selected Project Achievements");
    CONFIG.achievements.forEach((item) => {
      const card = append(section, "div", "exp-card");
      append(card, "div", "exp-title", item.title);
      append(card, "div", "exp-company", item.scale);
      append(card, "p", "about-text", item.description);
    });
    return section;
  },

  erp() {
    const section = sectionShell("erp", "ERP Experience");
    const list = append(section, "div", "erp-list");
    CONFIG.erpExperience.forEach((item) => {
      const badge = append(list, "div", "erp-badge", item.system);
      append(badge, "span", "", item.duration);
    });
    return section;
  },

  experience() {
    const section = sectionShell("experience", "Work Experience");
    CONFIG.experience.forEach((item) => {
      const card = append(section, "div", "exp-card");
      const header = append(card, "div", "exp-header");
      append(header, "span", "exp-title", item.title);
      append(header, "span", "exp-period", item.period);
      append(card, "div", "exp-company", item.company);
      const points = append(card, "ul", "exp-points");
      item.points.forEach((point) => append(points, "li", "", point));
      addTags(card, item.skills);
    });
    return section;
  },

  projects() {
    if (!CONFIG.projects?.length) return null;
    const section = sectionShell("projects", "Projects");
    const grid = append(section, "div", "projects-grid");
    const icons = ["🛠️", "📱", "🏨", "⚙️", "📊", "🔗"];
    CONFIG.projects.forEach((project, index) => {
      const card = append(grid, "div", "project-card");
      const top = append(card, "div", "project-card-top");
      append(top, "div", "project-icon", icons[index % icons.length]);
      append(top, "div", "project-title", project.title);
      if (project.statusId) {
        const status = append(top, "span", "project-status project-status--checking", "CHECKING");
        status.dataset.projectStatus = project.statusId;
        status.setAttribute("role", "status");
        status.setAttribute("aria-label", `${project.title} availability`);
      }
      append(card, "div", "project-desc", project.description);
      addTags(card, project.tech);
      const link = safeExternalLink("View Project →", project.link, "project-link");
      if (link) card.appendChild(link);
    });
    return section;
  },

  competencies() {
    if (!CONFIG.competencies?.length) return null;
    const section = sectionShell("competencies", "Core Competencies");
    const grid = append(section, "div", "competencies-grid");
    CONFIG.competencies.forEach((item) => {
      const row = append(grid, "div", "competency-item");
      append(row, "span", "competency-check", "✓");
      row.appendChild(document.createTextNode(String(item.name)));
    });
    return section;
  },

  skills() {
    const section = sectionShell("skills", "Skills");
    const grid = append(section, "div", "skills-grid");
    CONFIG.skills.forEach((skill) => {
      const item = append(grid, "div", "skill-item");
      item.appendChild(document.createTextNode(String(skill.name)));
      append(item, "small", "", `since ${skill.since}`);
    });
    return section;
  },

  education() {
    const section = sectionShell("education", "Education");
    CONFIG.education.forEach((item) => {
      const card = append(section, "div", "edu-card");
      append(card, "div", "edu-degree", item.degree);
      append(card, "div", "edu-institution", item.institution);
      append(card, "div", "edu-meta", `${item.grade} | ${item.period}`);
      if (item.activities?.length) {
        const list = append(card, "ul", "edu-activities");
        item.activities.forEach((activity) => append(list, "li", "", activity));
      }
    });
    return section;
  },

  contact() {
    const section = sectionShell("contact", "Contact");
    const grid = append(section, "div", "contact-grid");
    const link = safeExternalLink("LinkedIn", CONFIG.contact.linkedin, "contact-item");
    if (link) grid.appendChild(link);
    return section;
  },

  previousskills() {
    if (!CONFIG.previousskills?.length) return null;
    const section = sectionShell("previousskills", "Previous Skills");
    const grid = append(section, "div", "skills-grid");
    CONFIG.previousskills.forEach((skill) => {
      const item = append(grid, "div", "skill-item skill-item--muted");
      item.appendChild(document.createTextNode(String(skill.name)));
      append(item, "small", "", `since ${skill.since}`);
    });
    return section;
  },

  languages() {
    if (!CONFIG.languages?.length) return null;
    const section = sectionShell("languages", "Languages");
    const grid = append(section, "div", "skills-grid");
    CONFIG.languages.forEach((language) => {
      const item = append(grid, "div", "skill-item");
      item.appendChild(document.createTextNode(String(language.name)));
      append(item, "small", "", language.proficiency);
    });
    return section;
  },
};

(function initPage() {
  document.title = CONFIG.name;
  document.getElementById("page-title").textContent = CONFIG.name;
  document.getElementById("footer-name").textContent = CONFIG.name;
  document.getElementById("nav-brand").textContent = CONFIG.name.split(" ").slice(0, 2).join(" ");
  document.getElementById("hero-name").textContent = CONFIG.name;
  document.getElementById("hero-tagline").textContent = CONFIG.tagline;
  document.getElementById("hero-location").textContent = "📍 " + CONFIG.location;

  const contacts = document.getElementById("hero-contacts");
  const heroLinkedIn = safeExternalLink("LinkedIn", CONFIG.contact.linkedin, "");
  if (heroLinkedIn) contacts.appendChild(heroLinkedIn);

  const navLinks = document.getElementById("nav-links");
  const main = document.getElementById("main");
  const allowedSections = new Set(Object.keys(RENDERERS));

  CONFIG.sections.forEach((sectionId) => {
    if (typeof sectionId !== "string" || !allowedSections.has(sectionId)) return;
    const section = RENDERERS[sectionId]();
    if (!section) return;

    const item = makeElement("li");
    const link = makeElement("a", "", sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
    link.href = `#${sectionId}`;
    item.appendChild(link);
    navLinks.appendChild(item);
    main.appendChild(section);
  });

  document.querySelector(".nav-download").addEventListener("click", () => {
    if (typeof downloadCV === "function") downloadCV();
  });

  refreshProjectStatuses();
  window.addEventListener("focus", refreshProjectStatuses);
})();

async function refreshProjectStatuses() {
  const badges = [...document.querySelectorAll("[data-project-status]")];
  if (!badges.length) return;

  try {
    const response = await fetch("/api/project-status", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Status check unavailable");
    const data = await response.json();
    const statuses = new Map((Array.isArray(data.projects) ? data.projects : [])
      .map((project) => [project.id, project]));

    badges.forEach((badge) => {
      const project = statuses.get(badge.dataset.projectStatus);
      const isLive = project?.status === "live";
      badge.textContent = project ? (isLive ? "LIVE" : "OFFLINE") : "UNKNOWN";
      badge.className = `project-status ${project ? (isLive ? "project-status--live" : "project-status--offline") : "project-status--unknown"}`;
      badge.title = data.checkedAt ? `Checked ${new Date(data.checkedAt).toLocaleString()}` : "Availability check";
    });
  } catch {
    badges.forEach((badge) => {
      badge.textContent = "UNKNOWN";
      badge.className = "project-status project-status--unknown";
      badge.title = "Could not check availability";
    });
  }
}
