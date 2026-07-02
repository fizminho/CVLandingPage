const CONFIG = {
  name: "Muhammad Hafiz Bin Zulkiflee Amin",
  tagline: "Senior Software Developer",
  location: "Rawang, Selangor",
  about:
    "Highly skilled and experienced Software Engineer specializing in customizing Enterprise Resource Planning (ERP) systems. Proficient in .NET development, ERP customization, and integration. Strong expertise in ASP.NET, C#, SQL Server, and web technologies. Demonstrated success in delivering tailored solutions to meet client requirements and optimizing ERP functionalities. Experienced in working with popular ERP systems such as IFCA Property ERP and Microsoft Dynamics 365. Proven ability to develop web services, Windows services, and Web API for seamless system integration and data exchange. Committed to delivering high-quality software solutions while adhering to best practices and industry standards. Excellent problem-solving skills and a strong aptitude for technical analysis. A dedicated professional with a Bachelor's Degree in Information Technology and a passion for staying updated with the latest technologies and trends in the field. Ready to leverage expertise and contribute to the success of a dynamic organization as a .NET and ERP Developer.",

  contact: {
    email: "96muhdhafiz@gmail.com",
    phone: "0104237501",
    linkedin: "https://www.linkedin.com/in/muhammad-hafiz-4b6939146",
  },

  experience: [
    {
      title: "Senior Software Developer",
      company: "Dialog Group Berhad",
      period: "Dec 2023 - Present",
      points: [],
      skills: [],
    },
    {
      title: "Software Engineer",
      company: "IFCA MSC Bhd",
      period: "Dec 2019 - Dec 2023",
      points: [
        "Offering solutions, customization, and enhancements based on customer needs.",
        "Proficient in managing multiple modules of the IFCA System, including Procurement Management, Rental and Residential, Cash Management, and General Ledger.",
        "Providing support and training to new team members on customizing IFCA systems and related technologies.",
        "Generating informative reports for clients using SSRS Report.",
        "Implementing import/export functions for clients.",
        "Developing automation based on client's existing systems.",
        "Developing API integration between IFCA and HIMS (KPKT) to reduce workload for E-SPA purpose.",
        "Developing API interface between IFCA and Microkredit to allow Double Entry data from receipts and billings to flow into IFCA.",
        "Developing API interface between IFCA and PKNS for the whole General Ledger process, Double Entry from IFCA flows to GRP system.",
        "Experienced in creating EFT Files for UOB, AmBank and Maybank.",
      ],
      skills: ["MSSQL", "HTML", "JavaScript", "C#", "ASP.Net", "Web API"],
    },
    {
      title: "Technical Consultant",
      company: "9 Dots Consulting",
      period: "Jan 2019 - Dec 2019",
      points: [
        "Customizing Microsoft Dynamics 365 to meet client needs.",
        "Managing and maintaining Microsoft Dynamics 365 applications.",
        "Supporting the development of an Ionic app that integrates with Dynamics 365.",
        "Offering training and consulting services on Microsoft Dynamics 365 to customers.",
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
      title: "BayarLahh",
      description:
        "A personal finance web app to help users manage and track their payments and expenses easily.",
      tech: ["Next.js", "Vercel"],
      link: "https://bayarlahh.vercel.app/",
    },
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
    { system: "Dialog Group ERP", duration: "2 Years" },
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
