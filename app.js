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
})();
