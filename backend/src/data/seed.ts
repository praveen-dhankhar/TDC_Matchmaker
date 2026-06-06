/**
 * TDC Matchmaker — Profile Seed Generator
 * Generates 120 realistic Indian matrimonial profiles (60 Male, 60 Female)
 * with diverse demographics, professions, and preferences.
 */

import { v4 as uuidv4 } from 'uuid';
import { encrypt } from '../utils/encryption';
import { randomInt, randomPick, shuffle } from '../utils/helpers';
import type { Profile } from '../../../shared/types';
import fs from 'fs';
import path from 'path';

// ---- Data pools for realistic profile generation ----

const MALE_FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharva', 'Advait', 'Dhruv', 'Kabir',
  'Ritvik', 'Aarush', 'Kayaan', 'Darsh', 'Veer', 'Sahil', 'Rohan', 'Karan',
  'Rahul', 'Vikram', 'Nikhil', 'Amit', 'Raj', 'Ankit', 'Pranav', 'Siddharth',
  'Harsh', 'Kunal', 'Manish', 'Tarun', 'Gaurav', 'Varun', 'Akash', 'Mohit',
  'Deepak', 'Abhishek', 'Rajat', 'Suresh', 'Ramesh', 'Aakash', 'Neeraj',
  'Pankaj', 'Sachin', 'Vishal', 'Ajay', 'Naveen', 'Lokesh', 'Hemant',
  'Tushar', 'Yash', 'Dev', 'Arnav', 'Rishi', 'Shubham', 'Mayank',
];

const FEMALE_FIRST_NAMES = [
  'Aadhya', 'Ananya', 'Aanya', 'Diya', 'Myra', 'Sara', 'Anika', 'Ira',
  'Prisha', 'Riya', 'Ishita', 'Kavya', 'Meera', 'Neha', 'Pooja', 'Shreya',
  'Tanvi', 'Aditi', 'Avni', 'Bhavya', 'Charvi', 'Deepika', 'Esha', 'Gauri',
  'Hiral', 'Jiya', 'Kiara', 'Lavanya', 'Madhavi', 'Nisha', 'Pallavi',
  'Radhika', 'Sakshi', 'Trisha', 'Uma', 'Vidya', 'Yamini', 'Zara', 'Priyanka',
  'Swati', 'Nikita', 'Sneha', 'Anjali', 'Divya', 'Komal', 'Mansi', 'Ritika',
  'Sonal', 'Tanya', 'Varsha', 'Isha', 'Kriti', 'Nandini', 'Parul', 'Simran',
  'Aishwarya', 'Megha', 'Jyoti', 'Rashmi', 'Sunita',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Joshi', 'Reddy',
  'Nair', 'Menon', 'Iyer', 'Rao', 'Desai', 'Shah', 'Mehta', 'Kapoor',
  'Malhotra', 'Agarwal', 'Banerjee', 'Chatterjee', 'Das', 'Bose', 'Sen',
  'Mukherjee', 'Pillai', 'Thakur', 'Chauhan', 'Tiwari', 'Pandey', 'Mishra',
  'Saxena', 'Srivastava', 'Kulkarni', 'Bhatt', 'Goswami', 'Chowdhury',
  'Bajaj', 'Choudhary', 'Rathore', 'Naidu',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata',
  'Jaipur', 'Ahmedabad', 'Lucknow', 'Chandigarh', 'Indore', 'Noida',
  'Gurgaon', 'Kochi',
];

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist'];

const CASTES_BY_RELIGION: Record<string, string[]> = {
  Hindu: ['Brahmin', 'Kshatriya', 'Vaishya', 'Kayastha', 'Maratha', 'Rajput', 'Agarwal', 'Jat', 'Reddy', 'Nair'],
  Muslim: ['Syed', 'Sheikh', 'Pathan', 'Mughal', 'Ansari'],
  Christian: ['Catholic', 'Protestant', 'Syrian Christian', 'Anglo-Indian'],
  Sikh: ['Jat Sikh', 'Khatri', 'Arora', 'Ramgarhia'],
  Jain: ['Digambar', 'Shwetambar', 'Agarwal Jain'],
  Buddhist: ['Neo-Buddhist', 'Theravada'],
};

const MOTHER_TONGUES = [
  'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali',
  'Gujarati', 'Punjabi', 'Odia', 'Urdu',
];

const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi',
  'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Sanskrit',
];

const COLLEGES = [
  'IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kanpur', 'IIT Kharagpur',
  'BITS Pilani', 'NIT Trichy', 'NIT Warangal', 'Delhi University', 'Mumbai University',
  'Pune University', 'Anna University', 'Jadavpur University', 'SRCC Delhi',
  'St. Xavier\'s College', 'Christ University', 'Manipal University', 'VIT Vellore',
  'Amity University', 'Symbiosis International', 'IIM Ahmedabad', 'NMIMS Mumbai',
  'Loyola College Chennai', 'Presidency College', 'Hindu College Delhi',
  'Lady Shri Ram College', 'Miranda House', 'Stella Maris College',
  'St. Stephen\'s College', 'Hansraj College',
];

const DEGREES = [
  'B.Tech Computer Science', 'B.Tech Mechanical', 'B.Tech Electrical', 'B.Tech Civil',
  'BBA', 'B.Com', 'BA Economics', 'BA English', 'BSc Mathematics', 'BSc Physics',
  'MBBS', 'BDS', 'B.Arch', 'BCA', 'BA Psychology', 'BA Sociology',
  'B.Pharm', 'LLB', 'BSc Biotechnology', 'B.Des',
];

const PG_DEGREES = [
  'MBA Finance', 'MBA Marketing', 'MBA HR', 'M.Tech', 'MS Computer Science',
  'MA Economics', 'M.Com', 'MD', 'MCA', 'LLM', 'MPH', 'M.Des',
  'MBA Operations', 'MBA Analytics', 'PG Diploma Management',
];

const PROFESSIONS = [
  'Software Engineer', 'Data Scientist', 'Product Manager', 'Investment Banker',
  'Management Consultant', 'Doctor', 'Lawyer', 'Chartered Accountant', 'Architect',
  'Civil Servant (IAS)', 'Marketing Manager', 'Business Analyst', 'UX Designer',
  'Research Scientist', 'Financial Analyst', 'Entrepreneur', 'Professor',
  'Content Strategist', 'HR Manager', 'Operations Manager',
];

const COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Infosys', 'TCS', 'Wipro',
  'Flipkart', 'Zomato', 'Swiggy', 'Paytm', 'PhonePe', 'Razorpay', 'BYJU\'s',
  'Goldman Sachs', 'JP Morgan', 'McKinsey', 'BCG', 'Deloitte', 'EY', 'KPMG',
  'Reliance', 'Tata Group', 'Mahindra', 'HDFC Bank', 'ICICI Bank',
  'Apollo Hospitals', 'Fortis Healthcare', 'Max Healthcare',
];

const DESIGNATIONS = [
  'Software Engineer', 'Senior Software Engineer', 'Lead Engineer', 'Analyst',
  'Senior Analyst', 'Associate', 'Senior Associate', 'Manager', 'Senior Manager',
  'Vice President', 'Director', 'Consultant', 'Senior Consultant', 'Resident Doctor',
  'Assistant Professor', 'Associate Director',
];

const INCOME_RANGES = [
  '4-6 LPA', '6-8 LPA', '8-10 LPA', '10-15 LPA', '15-20 LPA',
  '20-30 LPA', '30-50 LPA', '50-75 LPA', '75-100 LPA', '100+ LPA',
];

const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Healthy', 'Heavy'];

const HOBBIES = [
  'Reading', 'Travelling', 'Photography', 'Cooking', 'Painting', 'Music',
  'Dancing', 'Yoga', 'Meditation', 'Hiking', 'Swimming', 'Cricket', 'Badminton',
  'Chess', 'Blogging', 'Gaming', 'Gardening', 'Movies', 'Theatre', 'Volunteering',
  'Running', 'Cycling', 'Gym', 'Singing', 'Writing',
];

const FATHER_OCCUPATIONS = [
  'Retired Government Officer', 'Businessman', 'Doctor', 'Engineer', 'Teacher',
  'Bank Manager', 'Lawyer', 'Chartered Accountant', 'Farmer', 'Retired Army Officer',
  'Professor', 'Architect', 'Contractor', 'Politician', 'Retired Police Officer',
];

const MOTHER_OCCUPATIONS = [
  'Homemaker', 'Teacher', 'Doctor', 'Nurse', 'Bank Employee', 'Professor',
  'Businesswoman', 'Government Employee', 'Retired Teacher', 'Social Worker',
];

const DEALBREAKERS = [
  'Smoking', 'Heavy Drinking', 'Different Religion', 'Unwilling to Relocate',
  'No Interest in Children', 'Non-Vegetarian', 'Long Distance',
  'Joint Family Required', 'Different Caste', 'No Higher Education',
];

const BIOS_MALE = [
  'A passionate technologist who loves exploring new ideas and building products that make a difference. Looking for a life partner who values intellectual curiosity.',
  'Family-oriented professional with a love for travel and adventure. I believe in balancing work and life. Seeking someone who shares my values.',
  'Creative thinker with a heart for social impact. When not working, you will find me trekking in the Himalayas or reading philosophy.',
  'Ambitious and driven professional who enjoys meaningful conversations over chai. Looking for a partner who is equally passionate about their goals.',
  'Simple at heart, modern in thinking. I value honesty, kindness, and a good sense of humor above all else.',
  'Fitness enthusiast and foodie — yes, both! I enjoy cooking weekend meals and running marathons. Seeking a partner who enjoys an active lifestyle.',
  'Music lover and weekend guitarist. I work hard during the week and unwind with friends and family. Looking for someone who brings joy and warmth.',
  'Born and raised in a close-knit family. I value traditions but embrace change. My ideal partner is someone who grows with me.',
];

const BIOS_FEMALE = [
  'An independent woman who balances career ambitions with deep family values. I love weekend brunches, book clubs, and spontaneous road trips.',
  'Creative professional with a passion for design and storytelling. I believe in building a relationship based on mutual respect and shared dreams.',
  'Health-conscious and spiritually inclined. I practice yoga daily and love experimenting with healthy recipes. Looking for a like-minded partner.',
  'Adventurous at heart with a calm demeanor. I enjoy traveling to offbeat places and documenting my journeys. Seeking a travel companion for life.',
  'A strong believer in education and personal growth. Currently pursuing my passion while building a meaningful career. Looking for an equal partner.',
  'Warm, empathetic, and always up for a good laugh. I value quality time and deep connections over material things.',
  'A bibliophile who dreams of having a home library. I enjoy classical music, art galleries, and meaningful conversations over coffee.',
  'Driven professional who finds balance in dance and meditation. I believe the best relationships are built on friendship first.',
];

// ---- Generator functions ----

function generateDOB(gender: 'Male' | 'Female'): string {
  // Age range: 24–35 for males, 22–32 for females
  const minAge = gender === 'Male' ? 24 : 22;
  const maxAge = gender === 'Male' ? 35 : 32;
  const age = randomInt(minAge, maxAge);
  const year = new Date().getFullYear() - age;
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'];
  const num = randomInt(1, 999);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num}@${randomPick(domains)}`;
}

function generatePhone(): string {
  const prefixes = ['98', '97', '96', '95', '94', '93', '91', '90', '88', '87', '86', '85', '70', '73', '74', '75', '76', '77', '78', '79'];
  return `+91${randomPick(prefixes)}${String(randomInt(10000000, 99999999))}`;
}

function generateHeight(gender: 'Male' | 'Female'): number {
  // Male: 165–188 cm, Female: 152–175 cm
  return gender === 'Male' ? randomInt(165, 188) : randomInt(152, 175);
}

function generateLanguages(motherTongue: string): string[] {
  const langs = new Set<string>(['English', motherTongue]);
  if (motherTongue !== 'Hindi') langs.add('Hindi');
  // Add 0–2 more random languages
  const extra = randomInt(0, 2);
  for (let i = 0; i < extra; i++) {
    langs.add(randomPick(LANGUAGES));
  }
  return Array.from(langs);
}

function generatePreferredCities(currentCity: string): string[] {
  const cities = new Set<string>([currentCity]);
  const extra = randomInt(1, 3);
  for (let i = 0; i < extra; i++) {
    cities.add(randomPick(CITIES));
  }
  return Array.from(cities);
}

function generateDealbreakers(): string[] {
  const count = randomInt(1, 3);
  return shuffle(DEALBREAKERS).slice(0, count);
}

function generateHobbies(): string[] {
  const count = randomInt(2, 5);
  return shuffle(HOBBIES).slice(0, count);
}

function generateProfile(
  gender: 'Male' | 'Female',
  index: number,
  matchmakerId: string
): Profile {
  const firstName = gender === 'Male'
    ? MALE_FIRST_NAMES[index % MALE_FIRST_NAMES.length]
    : FEMALE_FIRST_NAMES[index % FEMALE_FIRST_NAMES.length];
  const lastName = randomPick(LAST_NAMES);
  const religion = randomPick(RELIGIONS);
  const castes = CASTES_BY_RELIGION[religion] || ['General'];
  const caste = randomPick(castes);
  const motherTongue = randomPick(MOTHER_TONGUES);
  const city = randomPick(CITIES);
  const dob = generateDOB(gender);
  const hasPG = Math.random() > 0.4; // 60% chance of PG degree

  const incomeIndex = Math.min(
    INCOME_RANGES.length - 1,
    Math.floor(Math.random() * INCOME_RANGES.length * 0.8) + (hasPG ? 2 : 0)
  );

  return {
    id: uuidv4(),
    firstName,
    lastName,
    gender,
    dateOfBirth: dob,
    country: 'India',
    city,
    height: generateHeight(gender),
    bodyType: randomPick(BODY_TYPES),
    email: encrypt(generateEmail(firstName, lastName)),
    phoneNumber: encrypt(generatePhone()),
    undergraduateCollege: randomPick(COLLEGES),
    degree: randomPick(DEGREES),
    postgraduateDegree: hasPG ? randomPick(PG_DEGREES) : undefined,
    income: INCOME_RANGES[incomeIndex],
    currentCompany: randomPick(COMPANIES),
    designation: randomPick(DESIGNATIONS),
    profession: randomPick(PROFESSIONS),
    maritalStatus: Math.random() > 0.15 ? 'Never Married' : randomPick(['Divorced', 'Widowed'] as const),
    languagesKnown: generateLanguages(motherTongue),
    siblings: randomInt(0, 3),
    caste,
    subCaste: Math.random() > 0.5 ? `${caste} (${randomPick(['North', 'South', 'East', 'West'])})` : undefined,
    religion,
    motherTongue,
    familyType: Math.random() > 0.4 ? 'Nuclear' : 'Joint',
    fatherOccupation: randomPick(FATHER_OCCUPATIONS),
    motherOccupation: randomPick(MOTHER_OCCUPATIONS),
    wantKids: randomPick(['Yes', 'Yes', 'Yes', 'Maybe', 'No'] as const), // Weighted towards Yes
    openToRelocate: randomPick(['Yes', 'Maybe', 'No'] as const),
    openToPets: randomPick(['Yes', 'Maybe', 'No'] as const),
    diet: randomPick(['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'] as const),
    drinking: randomPick(['Never', 'Occasionally', 'Occasionally', 'Regularly'] as const),
    smoking: randomPick(['Never', 'Never', 'Never', 'Occasionally', 'Regularly'] as const),
    bio: randomPick(gender === 'Male' ? BIOS_MALE : BIOS_FEMALE),
    hobbies: generateHobbies(),
    profilePhotoUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${firstName}${lastName}${index}`,
    verifiedAt: new Date(Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000).toISOString(),
    preferredAgeRange: gender === 'Male'
      ? { min: 21, max: 30 }
      : { min: 25, max: 38 },
    preferredCities: generatePreferredCities(city),
    preferredReligion: Math.random() > 0.3 ? [religion] : [religion, randomPick(RELIGIONS)],
    dealbreakers: generateDealbreakers(),
    physicalDisability: Math.random() > 0.95 ? 'Minor visual impairment' : undefined,
    assignedMatchmakerId: matchmakerId,
    status: randomPick(['New Lead', 'New Lead', 'In Progress', 'In Progress', 'Matched'] as const),
  };
}

// ---- Main seed function ----

export function generateAllProfiles(matchmakerId: string): Profile[] {
  const profiles: Profile[] = [];

  for (let i = 0; i < 60; i++) {
    profiles.push(generateProfile('Male', i, matchmakerId));
  }
  for (let i = 0; i < 60; i++) {
    profiles.push(generateProfile('Female', i, matchmakerId));
  }

  return shuffle(profiles);
}

// Run as standalone script
if (require.main === module) {
  const MATCHMAKER_ID = 'mm-001';
  const profiles = generateAllProfiles(MATCHMAKER_ID);

  const outputPath = path.resolve(__dirname, 'profiles.json');
  fs.writeFileSync(outputPath, JSON.stringify(profiles, null, 2));
  console.log(`✅ Generated ${profiles.length} profiles → ${outputPath}`);
  console.log(`   Males: ${profiles.filter((p) => p.gender === 'Male').length}`);
  console.log(`   Females: ${profiles.filter((p) => p.gender === 'Female').length}`);
}
