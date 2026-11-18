const mongoose = require("mongoose");
const Event = require("./backend/models/Event");
const Registration = require("./backend/models/Registration");

const seedData = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/campus_events");
    console.log("Connected to MongoDB for seeding...");

    await Event.deleteMany({});
    await Registration.deleteMany({});
    console.log("Cleared existing events and registrations.");

    const events = [
      {
        "_id": "EVT101",
        "title": "HackCampus 2026",
        "category": "Technical",
        "organizerClub": "Coding Club",
        "venue": "Auditorium A",
        "capacity": 200,
        "seatsAvailable": 45,
        "entryFee": 150,
        "tags": ["hackathon", "coding", "prizes"],
        "coordinators": [{ "name": "Aarav Sharma", "contact": "aarav@college.edu" }],
        "sponsors": ["TechCorp", "DevStudio"]
      },
      {
        "_id": "EVT102",
        "title": "Annual Music Night",
        "category": "Cultural",
        "organizerClub": "Music Society",
        "venue": "Open Air Theatre",
        "capacity": 500,
        "seatsAvailable": 120,
        "entryFee": 0,
        "tags": ["music", "concert", "night"],
        "coordinators": [{ "name": "Riya Sen", "contact": "riya@college.edu" }],
        "sponsors": []
      },
      {
        "_id": "EVT103",
        "title": "AI & Robotics Workshop",
        "category": "Technical",
        "organizerClub": "Robotics Club",
        "venue": "Lab 3",
        "capacity": 60,
        "seatsAvailable": 10,
        "entryFee": 50,
        "tags": ["ai", "robotics", "workshop"],
        "coordinators": [{ "name": "Karan Patel", "contact": "karan@college.edu" }],
        "sponsors": ["RoboLabs"]
      }
    ];

    await Event.insertMany(events);
    console.log("Inserted events successfully!");

    // Helper to evaluate raw date string setup
    const registrations = [
      // EVT101
      { "ticketId": "TICK-2026-001", "eventId": "EVT101", "studentId": "STU8821", "studentName": "Priya Verma", "department": "Computer Science", "year": 3, "registrationDate": new Date("2026-09-12T14:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-002", "eventId": "EVT101", "studentId": "STU4412", "studentName": "Rohan Gupta", "department": "Electrical Engineering", "year": 2, "registrationDate": new Date("2026-09-14T11:20:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-003", "eventId": "EVT101", "studentId": "STU1001", "studentName": "Amit Deshmukh", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-12T09:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-004", "eventId": "EVT101", "studentId": "STU1002", "studentName": "Sneha Kulkarni", "department": "Information Technology", "year": 3, "registrationDate": new Date("2026-09-12T09:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-005", "eventId": "EVT101", "studentId": "STU1003", "studentName": "Vikram Joshi", "department": "Mechanical Engineering", "year": 4, "registrationDate": new Date("2026-09-12T10:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-006", "eventId": "EVT101", "studentId": "STU1004", "studentName": "Pooja Mehta", "department": "Computer Science", "year": 1, "registrationDate": new Date("2026-09-12T10:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-007", "eventId": "EVT101", "studentId": "STU1005", "studentName": "Rahul Nair", "department": "Electronics", "year": 2, "registrationDate": new Date("2026-09-12T11:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-008", "eventId": "EVT101", "studentId": "STU1006", "studentName": "Divya Reddy", "department": "Information Technology", "year": 3, "registrationDate": new Date("2026-09-12T11:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Pending" } },
      { "ticketId": "TICK-2026-009", "eventId": "EVT101", "studentId": "STU1007", "studentName": "Arjun Tiwari", "department": "Civil Engineering", "year": 4, "registrationDate": new Date("2026-09-12T12:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-010", "eventId": "EVT101", "studentId": "STU1008", "studentName": "Neha Saxena", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-12T12:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-011", "eventId": "EVT101", "studentId": "STU1009", "studentName": "Siddharth Rao", "department": "Electrical Engineering", "year": 3, "registrationDate": new Date("2026-09-12T13:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-012", "eventId": "EVT101", "studentId": "STU1010", "studentName": "Kavya Iyer", "department": "Electronics", "year": 1, "registrationDate": new Date("2026-09-12T13:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-013", "eventId": "EVT101", "studentId": "STU1011", "studentName": "Manish Kumar", "department": "Mechanical Engineering", "year": 2, "registrationDate": new Date("2026-09-13T08:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-014", "eventId": "EVT101", "studentId": "STU1012", "studentName": "Shruti Pandey", "department": "Computer Science", "year": 4, "registrationDate": new Date("2026-09-13T08:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-015", "eventId": "EVT101", "studentId": "STU1013", "studentName": "Aditya Bhatt", "department": "Information Technology", "year": 1, "registrationDate": new Date("2026-09-13T09:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-016", "eventId": "EVT101", "studentId": "STU1014", "studentName": "Tanvi Chauhan", "department": "Civil Engineering", "year": 3, "registrationDate": new Date("2026-09-13T09:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-017", "eventId": "EVT101", "studentId": "STU1015", "studentName": "Harsh Agarwal", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-13T10:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Failed" } },
      { "ticketId": "TICK-2026-018", "eventId": "EVT101", "studentId": "STU1016", "studentName": "Ishita Malhotra", "department": "Electronics", "year": 3, "registrationDate": new Date("2026-09-13T10:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-019", "eventId": "EVT101", "studentId": "STU1017", "studentName": "Deepak Yadav", "department": "Electrical Engineering", "year": 4, "registrationDate": new Date("2026-09-13T11:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-020", "eventId": "EVT101", "studentId": "STU1018", "studentName": "Megha Singh", "department": "Information Technology", "year": 1, "registrationDate": new Date("2026-09-13T11:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-021", "eventId": "EVT101", "studentId": "STU1019", "studentName": "Nikhil Bansal", "department": "Mechanical Engineering", "year": 2, "registrationDate": new Date("2026-09-13T12:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-022", "eventId": "EVT101", "studentId": "STU1020", "studentName": "Sakshi Thakur", "department": "Computer Science", "year": 3, "registrationDate": new Date("2026-09-13T12:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-023", "eventId": "EVT101", "studentId": "STU1021", "studentName": "Gaurav Mishra", "department": "Civil Engineering", "year": 4, "registrationDate": new Date("2026-09-14T08:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-024", "eventId": "EVT101", "studentId": "STU1022", "studentName": "Pallavi Dubey", "department": "Electronics", "year": 1, "registrationDate": new Date("2026-09-14T08:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-025", "eventId": "EVT101", "studentId": "STU1023", "studentName": "Rajat Sinha", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-14T09:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-026", "eventId": "EVT101", "studentId": "STU1024", "studentName": "Anita Kapoor", "department": "Information Technology", "year": 3, "registrationDate": new Date("2026-09-14T09:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Pending" } },
      { "ticketId": "TICK-2026-027", "eventId": "EVT101", "studentId": "STU1025", "studentName": "Vivek Menon", "department": "Electrical Engineering", "year": 4, "registrationDate": new Date("2026-09-14T10:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-028", "eventId": "EVT101", "studentId": "STU1026", "studentName": "Ritu Sharma", "department": "Mechanical Engineering", "year": 1, "registrationDate": new Date("2026-09-14T10:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-029", "eventId": "EVT101", "studentId": "STU1027", "studentName": "Kunal Chopra", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-14T11:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-030", "eventId": "EVT101", "studentId": "STU1028", "studentName": "Swati Patil", "department": "Civil Engineering", "year": 3, "registrationDate": new Date("2026-09-14T11:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-031", "eventId": "EVT101", "studentId": "STU1029", "studentName": "Abhishek Das", "department": "Electronics", "year": 4, "registrationDate": new Date("2026-09-14T12:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-032", "eventId": "EVT101", "studentId": "STU1030", "studentName": "Nandini Pillai", "department": "Information Technology", "year": 1, "registrationDate": new Date("2026-09-14T12:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-033", "eventId": "EVT101", "studentId": "STU1031", "studentName": "Tarun Bose", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-15T08:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-034", "eventId": "EVT101", "studentId": "STU1032", "studentName": "Jyoti Rathore", "department": "Electrical Engineering", "year": 3, "registrationDate": new Date("2026-09-15T08:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 150, "status": "Completed" } },
      { "ticketId": "TICK-2026-035", "eventId": "EVT101", "studentId": "STU1033", "studentName": "Mohit Garg", "department": "Mechanical Engineering", "year": 4, "registrationDate": new Date("2026-09-15T09:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 150, "status": "Failed" } },

      // EVT102
      { "ticketId": "TICK-2026-036", "eventId": "EVT102", "studentId": "STU8821", "studentName": "Priya Verma", "department": "Computer Science", "year": 3, "registrationDate": new Date("2026-09-13T10:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-037", "eventId": "EVT102", "studentId": "STU2001", "studentName": "Simran Kaur", "department": "Computer Science", "year": 1, "registrationDate": new Date("2026-09-13T10:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-038", "eventId": "EVT102", "studentId": "STU2002", "studentName": "Akash Verma", "department": "Electrical Engineering", "year": 2, "registrationDate": new Date("2026-09-13T10:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-039", "eventId": "EVT102", "studentId": "STU2003", "studentName": "Meera Nambiar", "department": "Information Technology", "year": 3, "registrationDate": new Date("2026-09-13T10:45:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-040", "eventId": "EVT102", "studentId": "STU2004", "studentName": "Varun Sethi", "department": "Mechanical Engineering", "year": 4, "registrationDate": new Date("2026-09-13T11:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-041", "eventId": "EVT102", "studentId": "STU2005", "studentName": "Anjali Srivastava", "department": "Electronics", "year": 1, "registrationDate": new Date("2026-09-13T11:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-042", "eventId": "EVT102", "studentId": "STU2006", "studentName": "Rohit Chandra", "department": "Civil Engineering", "year": 2, "registrationDate": new Date("2026-09-13T11:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-043", "eventId": "EVT102", "studentId": "STU2007", "studentName": "Preeti Jain", "department": "Computer Science", "year": 3, "registrationDate": new Date("2026-09-13T11:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-044", "eventId": "EVT102", "studentId": "STU2008", "studentName": "Suresh Pillai", "department": "Information Technology", "year": 4, "registrationDate": new Date("2026-09-13T12:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-045", "eventId": "EVT102", "studentId": "STU2009", "studentName": "Komal Bhardwaj", "department": "Electrical Engineering", "year": 1, "registrationDate": new Date("2026-09-13T12:15:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-046", "eventId": "EVT102", "studentId": "STU2010", "studentName": "Pankaj Dutta", "department": "Mechanical Engineering", "year": 2, "registrationDate": new Date("2026-09-13T12:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-047", "eventId": "EVT102", "studentId": "STU2011", "studentName": "Tanya Oberoi", "department": "Electronics", "year": 3, "registrationDate": new Date("2026-09-13T12:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-048", "eventId": "EVT102", "studentId": "STU2012", "studentName": "Yash Khanna", "department": "Computer Science", "year": 4, "registrationDate": new Date("2026-09-13T13:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-049", "eventId": "EVT102", "studentId": "STU2013", "studentName": "Sonal Awasthi", "department": "Civil Engineering", "year": 1, "registrationDate": new Date("2026-09-13T13:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-050", "eventId": "EVT102", "studentId": "STU2014", "studentName": "Vishal Ahluwalia", "department": "Information Technology", "year": 2, "registrationDate": new Date("2026-09-13T13:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-051", "eventId": "EVT102", "studentId": "STU2015", "studentName": "Aarti Hegde", "department": "Electrical Engineering", "year": 3, "registrationDate": new Date("2026-09-13T13:45:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-052", "eventId": "EVT102", "studentId": "STU2016", "studentName": "Dhruv Mahajan", "department": "Mechanical Engineering", "year": 4, "registrationDate": new Date("2026-09-13T14:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-053", "eventId": "EVT102", "studentId": "STU2017", "studentName": "Kriti Bajaj", "department": "Electronics", "year": 1, "registrationDate": new Date("2026-09-13T14:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-054", "eventId": "EVT102", "studentId": "STU2018", "studentName": "Ajay Mohan", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-13T14:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-055", "eventId": "EVT102", "studentId": "STU2019", "studentName": "Bhavna Gill", "department": "Civil Engineering", "year": 3, "registrationDate": new Date("2026-09-13T14:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-056", "eventId": "EVT102", "studentId": "STU2020", "studentName": "Chirag Luthra", "department": "Information Technology", "year": 4, "registrationDate": new Date("2026-09-13T15:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-057", "eventId": "EVT102", "studentId": "STU2021", "studentName": "Geeta Ranganathan", "department": "Electrical Engineering", "year": 1, "registrationDate": new Date("2026-09-13T15:15:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-058", "eventId": "EVT102", "studentId": "STU2022", "studentName": "Hemant Grover", "department": "Mechanical Engineering", "year": 2, "registrationDate": new Date("2026-09-13T15:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-059", "eventId": "EVT102", "studentId": "STU2023", "studentName": "Isha Vohra", "department": "Electronics", "year": 3, "registrationDate": new Date("2026-09-13T15:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-060", "eventId": "EVT102", "studentId": "STU2024", "studentName": "Jayesh Naik", "department": "Computer Science", "year": 4, "registrationDate": new Date("2026-09-14T08:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-061", "eventId": "EVT102", "studentId": "STU2025", "studentName": "Lavanya Choudhury", "department": "Civil Engineering", "year": 1, "registrationDate": new Date("2026-09-14T08:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-062", "eventId": "EVT102", "studentId": "STU2026", "studentName": "Manoj Kulshreshtha", "department": "Information Technology", "year": 2, "registrationDate": new Date("2026-09-14T08:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-063", "eventId": "EVT102", "studentId": "STU2027", "studentName": "Nisha Rawat", "department": "Electrical Engineering", "year": 3, "registrationDate": new Date("2026-09-14T08:45:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-064", "eventId": "EVT102", "studentId": "STU2028", "studentName": "Omkar Bhagat", "department": "Mechanical Engineering", "year": 4, "registrationDate": new Date("2026-09-14T09:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-065", "eventId": "EVT102", "studentId": "STU2029", "studentName": "Payal Trehan", "department": "Electronics", "year": 1, "registrationDate": new Date("2026-09-14T09:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-066", "eventId": "EVT102", "studentId": "STU2030", "studentName": "Rakesh Sundaram", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-14T09:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-067", "eventId": "EVT102", "studentId": "STU2031", "studentName": "Sanya Ahuja", "department": "Civil Engineering", "year": 3, "registrationDate": new Date("2026-09-14T09:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-068", "eventId": "EVT102", "studentId": "STU2032", "studentName": "Tushar Lamba", "department": "Information Technology", "year": 4, "registrationDate": new Date("2026-09-14T10:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-069", "eventId": "EVT102", "studentId": "STU2033", "studentName": "Uma Venkatesh", "department": "Electrical Engineering", "year": 1, "registrationDate": new Date("2026-09-14T10:15:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },
      { "ticketId": "TICK-2026-070", "eventId": "EVT102", "studentId": "STU2034", "studentName": "Vinay Saxena", "department": "Mechanical Engineering", "year": 2, "registrationDate": new Date("2026-09-14T10:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Free", "amountPaid": 0, "status": "Completed" } },

      // EVT103
      { "ticketId": "TICK-2026-071", "eventId": "EVT103", "studentId": "STU9903", "studentName": "Ananya Roy", "department": "Computer Science", "year": 4, "registrationDate": new Date("2026-09-15T16:45:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-072", "eventId": "EVT103", "studentId": "STU3001", "studentName": "Aryan Kapoor", "department": "Computer Science", "year": 3, "registrationDate": new Date("2026-09-15T08:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-073", "eventId": "EVT103", "studentId": "STU3002", "studentName": "Disha Mukherjee", "department": "Electronics", "year": 2, "registrationDate": new Date("2026-09-15T08:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-074", "eventId": "EVT103", "studentId": "STU3003", "studentName": "Farhan Sheikh", "department": "Electrical Engineering", "year": 4, "registrationDate": new Date("2026-09-15T08:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-075", "eventId": "EVT103", "studentId": "STU3004", "studentName": "Garima Tandon", "department": "Information Technology", "year": 1, "registrationDate": new Date("2026-09-15T08:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-076", "eventId": "EVT103", "studentId": "STU3005", "studentName": "Hitesh Chawla", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-15T09:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-077", "eventId": "EVT103", "studentId": "STU3006", "studentName": "Ira Deshpande", "department": "Mechanical Engineering", "year": 3, "registrationDate": new Date("2026-09-15T09:15:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-078", "eventId": "EVT103", "studentId": "STU3007", "studentName": "Jai Prakash", "department": "Civil Engineering", "year": 4, "registrationDate": new Date("2026-09-15T09:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-079", "eventId": "EVT103", "studentId": "STU3008", "studentName": "Kiara Bhat", "department": "Electronics", "year": 1, "registrationDate": new Date("2026-09-15T09:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-080", "eventId": "EVT103", "studentId": "STU3009", "studentName": "Lakshay Walia", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-15T10:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Pending" } },
      { "ticketId": "TICK-2026-081", "eventId": "EVT103", "studentId": "STU3010", "studentName": "Maitri Shah", "department": "Information Technology", "year": 3, "registrationDate": new Date("2026-09-15T10:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-082", "eventId": "EVT103", "studentId": "STU3011", "studentName": "Nakul Anand", "department": "Electrical Engineering", "year": 4, "registrationDate": new Date("2026-09-15T10:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-083", "eventId": "EVT103", "studentId": "STU3012", "studentName": "Ojaswi Thapa", "department": "Mechanical Engineering", "year": 1, "registrationDate": new Date("2026-09-15T10:45:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-084", "eventId": "EVT103", "studentId": "STU3013", "studentName": "Pranav Gokhale", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-15T11:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-085", "eventId": "EVT103", "studentId": "STU3014", "studentName": "Rhea Kamath", "department": "Civil Engineering", "year": 3, "registrationDate": new Date("2026-09-15T11:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-086", "eventId": "EVT103", "studentId": "STU3015", "studentName": "Sahil Mehra", "department": "Electronics", "year": 4, "registrationDate": new Date("2026-09-15T11:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-087", "eventId": "EVT103", "studentId": "STU3016", "studentName": "Trisha Ganguly", "department": "Information Technology", "year": 1, "registrationDate": new Date("2026-09-15T11:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-088", "eventId": "EVT103", "studentId": "STU3017", "studentName": "Utkarsh Vyas", "department": "Electrical Engineering", "year": 2, "registrationDate": new Date("2026-09-15T12:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-089", "eventId": "EVT103", "studentId": "STU3018", "studentName": "Vidhi Sharma", "department": "Mechanical Engineering", "year": 3, "registrationDate": new Date("2026-09-15T12:15:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Failed" } },
      { "ticketId": "TICK-2026-090", "eventId": "EVT103", "studentId": "STU3019", "studentName": "Wasim Raza", "department": "Computer Science", "year": 4, "registrationDate": new Date("2026-09-15T12:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-091", "eventId": "EVT103", "studentId": "STU3020", "studentName": "Yamini Iyer", "department": "Civil Engineering", "year": 1, "registrationDate": new Date("2026-09-15T12:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-092", "eventId": "EVT103", "studentId": "STU3021", "studentName": "Zoya Khan", "department": "Electronics", "year": 2, "registrationDate": new Date("2026-09-15T13:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-093", "eventId": "EVT103", "studentId": "STU3022", "studentName": "Abhinav Tomar", "department": "Information Technology", "year": 3, "registrationDate": new Date("2026-09-15T13:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-094", "eventId": "EVT103", "studentId": "STU3023", "studentName": "Bhoomika Rane", "department": "Electrical Engineering", "year": 4, "registrationDate": new Date("2026-09-15T13:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-095", "eventId": "EVT103", "studentId": "STU3024", "studentName": "Chetan Hegde", "department": "Computer Science", "year": 1, "registrationDate": new Date("2026-09-15T13:45:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-096", "eventId": "EVT103", "studentId": "STU3025", "studentName": "Deepika Nair", "department": "Mechanical Engineering", "year": 2, "registrationDate": new Date("2026-09-15T14:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-097", "eventId": "EVT103", "studentId": "STU1005", "studentName": "Rahul Nair", "department": "Electronics", "year": 2, "registrationDate": new Date("2026-09-15T14:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-098", "eventId": "EVT103", "studentId": "STU1010", "studentName": "Kavya Iyer", "department": "Electronics", "year": 1, "registrationDate": new Date("2026-09-15T14:30:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-099", "eventId": "EVT103", "studentId": "STU1015", "studentName": "Harsh Agarwal", "department": "Computer Science", "year": 2, "registrationDate": new Date("2026-09-15T14:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-100", "eventId": "EVT103", "studentId": "STU1020", "studentName": "Sakshi Thakur", "department": "Computer Science", "year": 3, "registrationDate": new Date("2026-09-15T15:00:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-101", "eventId": "EVT103", "studentId": "STU2005", "studentName": "Anjali Srivastava", "department": "Electronics", "year": 1, "registrationDate": new Date("2026-09-15T15:15:00Z"), "checkInStatus": false, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Pending" } },
      { "ticketId": "TICK-2026-102", "eventId": "EVT103", "studentId": "STU2010", "studentName": "Pankaj Dutta", "department": "Mechanical Engineering", "year": 2, "registrationDate": new Date("2026-09-15T15:30:00Z"), "checkInStatus": true, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-103", "eventId": "EVT103", "studentId": "STU2015", "studentName": "Aarti Hegde", "department": "Electrical Engineering", "year": 3, "registrationDate": new Date("2026-09-15T15:45:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-104", "eventId": "EVT103", "studentId": "STU2020", "studentName": "Chirag Luthra", "department": "Information Technology", "year": 4, "registrationDate": new Date("2026-09-15T16:00:00Z"), "checkInStatus": false, "paymentDetails": { "method": "UPI", "amountPaid": 50, "status": "Completed" } },
      { "ticketId": "TICK-2026-105", "eventId": "EVT103", "studentId": "STU2025", "studentName": "Lavanya Choudhury", "department": "Civil Engineering", "year": 1, "registrationDate": new Date("2026-09-15T16:15:00Z"), "checkInStatus": true, "paymentDetails": { "method": "Card", "amountPaid": 50, "status": "Completed" } }
    ];

    await Registration.insertMany(registrations);
    console.log(`Inserted ${registrations.length} registrations successfully!`);

    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedData();
