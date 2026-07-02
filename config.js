const CONFIG = {
  name: "Muhammad Hafiz Bin Zulkiflee Amin",
  tagline: "Software Engineer",
  location: "Rawang, Selangor",
  about:
    "Experienced Software Engineer with 4 years of customising Enterprise Resources Planning System (ERP). Skilled with MS-SQL scripting with stored procedures, views and functions to develop SSRS Reports and backend logics. Able to develop and meet client requirements by customising company's products using C#, JavaScript, HTML, X++, ASP.Net. Have a very strong interest in various ERP systems.",

  contact: {
    email: "96muhdhafiz@gmail.com",
    phone: "0104237501",
    linkedin: "https://www.linkedin.com/in/muhammad-hafiz-4b6939146",
  },

  experience: [
    {
      title: "Software Engineer",
      company: "IFCA MSC Bhd",
      period: "Dec 2019 - Present",
      points: [
        "Provides solutions, customisation and improvement based on customer requirements.",
        "Experienced in handling IFCA System modules: Procurement Management, Rental and Residential, Cash Management, General Ledger.",
        "Provides guidance to new joiners on how to customise IFCA systems.",
        "Massages and provides meaningful data to clients in reports using SSRS Report.",
        "Develops Import/Export functions for clients.",
        "Builds automation based on client's existing systems.",
      ],
      skills: ["MSSQL", "HTML", "JavaScript", "C#", "ASP.Net"],
    },
    {
      title: "Technical Consultant",
      company: "9 Dots Consulting",
      period: "Jan 2019 - Dec 2019",
      points: [
        "Customizing Microsoft Dynamics 365 based on client requirements.",
        "Maintaining Microsoft Dynamics 365 applications.",
        "Assisted in developing Ionic App with integration between D365 and Ionic App.",
        "Provides training and consultation to customers on Microsoft D365 basics.",
      ],
      skills: ["X++", "MSSQL", "C#", "IONIC Framework", "SSRS"],
    },
    {
      title: "IT Intern",
      company: "TH Plantations Bhd (THP)",
      period: "Jul 2018 - Jan 2019",
      points: [
        "Experienced in Mill and Estate system.",
        "Assisted team to complete R&D project: Water level sensors for Palm Estate.",
        "Provides training to users on Palm Workers Management system.",
        "Built Booking system for internal hotels using VB.Net & ASP.Net.",
      ],
      skills: ["VB.Net", "ASP.Net"],
    },
  ],

  skills: [
    { name: "C#", since: "2019" },
    { name: "HTML", since: "2019" },
    { name: "MS SQL", since: "2019" },
    { name: "JavaScript", since: "2019" },
    { name: "ASP.NET", since: "2019" },
    { name: "SSRS Reporting", since: "2019" },
    { name: "X++", since: "2019" },
    { name: "IONIC Framework", since: "2019" },
  ],

  education: [
    {
      degree: "Bachelor Degree Information Technology",
      institution: "Universiti Tun Hussein Onn Malaysia",
      grade: "Upper Second Class Honours — CGPA 3.40",
      period: "Jun 2015 - Dec 2019",
      activities: [
        "President of Program Kemasyarakatan and Bakti Siswa club.",
        "Led community service visit to a village near Kota Tinggi, Johor.",
        "Organised beach and village cleaning activities.",
      ],
    },
  ],

  // Add new projects here freely
  projects: [
    {
      title: "IFCA ERP Customisations",
      description:
        "Various customisations and automation solutions for IFCA Property ERP clients covering Procurement, Cash Management, and General Ledger modules.",
      tech: ["C#", "MSSQL", "ASP.Net", "SSRS", "JavaScript"],
      link: "",
    },
    {
      title: "D365 Ionic Integration",
      description:
        "Mobile application integrating Microsoft Dynamics 365 with an Ionic Framework app for field operations.",
      tech: ["X++", "IONIC Framework", "C#", "MSSQL"],
      link: "",
    },
    {
      title: "Internal Hotel Booking System",
      description:
        "Booking management system built for TH Plantations internal hotel operations.",
      tech: ["VB.Net", "ASP.Net"],
      link: "",
    },
  ],

  erpExperience: [
    { system: "IFCA Property ERP", duration: "4 Years" },
    { system: "Microsoft Dynamics 365", duration: "1 Year" },
  ],

  references: [
    {
      name: "Azrul Amin bin Ibrahim",
      company: "9 Dots Consulting Sdn Bhd",
      phone: "60132222653",
      email: "azrul.amin@9dots.com",
    },
  ],

  // Controls which sections appear and their order on the page
  // Available: "about", "erp", "experience", "projects", "skills", "education", "contact"
  sections: ["about", "erp", "experience", "projects", "skills", "education", "contact"],
};
