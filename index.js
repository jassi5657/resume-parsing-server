const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const textract = require('textract');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import cors
const app = express();
const port = 5000;
const _ = require('lodash');

app.use(cors());

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Required skills to check
// const requiredSkills = ['Java', 'Node', 'Python', 'C/C++'];
let requiredSkills = [];


 



// Define subskills for each required skill
let skillSubskills = {};

// Function to add a subskill
function addSubskill(skill, subskill) {
  const lowerSkill = skill.toLowerCase();

  // Check if the skill exists in the object
  if (skillSubskills[skill] || skillSubskills[lowerSkill]) {
    // Use the original skill if it exists, otherwise use the lowercase version
    const existingSkill = skillSubskills[skill] ? skill : lowerSkill;

    // Check if the subskill already exists to avoid duplicates
    if (!skillSubskills[existingSkill].includes(subskill)) {
      skillSubskills[existingSkill].push(subskill);
    } else {
      console.log(`${subskill} already exists under ${existingSkill}.`);
    }
  } else {
    console.log(`Skill ${skill} does not exist.`);
  }
}

// Function to extract skills from the resume text
const extractSkills = (text, selectedSkills) => {
  // Convert selected skills into a regex pattern
  const skillPattern = new RegExp(`\\b(${selectedSkills.join('|')})\\b`, 'gi');

  // Match the skills in the text
  const detectedSkills = text.match(skillPattern) || [];

  // Normalize and deduplicate detected skills
  const uniqueSkills = _.uniq(
    detectedSkills.map(skill => {
      if (skill.toLowerCase() === 'node' || skill.toLowerCase() === 'node.js') {
        return 'Node'; // Normalize Node.js and Node to "Node"
      }
      if (['c', 'c++'].includes(skill.toLowerCase())) {
        return 'C/C++'; // Normalize C and C++ to "C/C++"
      }
      return skill;
    })
  );

  return uniqueSkills;
};



// Check for subskills in the text
const extractSubskills = (text, skill) => {
  console.log(`Extracting subskills for skill: ${skill}`); // Log the skill being checked

  // Normalize the skill key to lowercase for lookup
  const normalizedSkill = skill.toLowerCase();
  // Check if the skill exists in the object (case-insensitive)
  if (!skillSubskills[normalizedSkill]) {
    console.log(`No subskills found for skill: ${skill}`); // Log if no subskills are available
    return [];
  }
  // Normalize subskills and text to lowercase for case-insensitive comparison
  const foundSubskills = skillSubskills[normalizedSkill].filter(subskill =>
    text.toLowerCase().includes(subskill.toLowerCase())
  );
  return foundSubskills;
};





const extractCertifications = (text) => {
  const certPattern = /(Acquired|Obtained|Earned|Certificate|Certified|Course).*?\./g;
  const certifications = text.match(certPattern) || [];

  // Filter out any "JavaScript" certifications for "Java"
  return certifications.filter(cert => 
    !cert.toLowerCase().includes('javascript') // Exclude JavaScript from Java skill matching
  );
};

const extractEmail = (text) => {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const emailMatch = text.match(emailPattern);
  return emailMatch ? emailMatch[0] : '';
};

const extractPhone = (text) => {
  const phonePattern = /(\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})/;
  const phoneMatch = text.match(phonePattern);
  return phoneMatch ? phoneMatch[0] : '';
};

const extractCollege = (text) => {
  // Look for patterns after 'University', 'College', or similar keywords
  const collegePattern = /(University|College)[\s\S]*?(?:\(|,)([\w\s]+?)(?:\)|,)/i;
  const match = text.match(collegePattern);

  if (match) {
    return match[2].trim(); // Return the captured college name (match[2])
  } else {
    return 'Unknown College'; // If no college name is found, return a default message
  }
};

const extractName = (text) => {
  const namePattern = /([A-Z][a-z]+(?: [A-Z][a-z]+)+|[A-Z\s]+(?: [A-Z\s]+)+)/;
  
  const nameMatch = text.match(namePattern);
  
  if (nameMatch) {
    const fullName = nameMatch[0].trim();
    
    if (fullName.match(/[A-Z]\s+[A-Z]/)) {
      const parts = fullName.split(' ');
      parts.pop(); 
      return parts.join(' '); 
    }
    
    return fullName;
  } else {
    return 'Unknown Name'; // If no name is found, return default text
  }
};


const extractProjects = (text) => {
  // Define a regex to capture projects - assuming format like "Project Title | Skills Used"
  const projectPattern = /([A-Za-z0-9\s\-\_]+?)\s*\|\s*(.*?)\s*(\d{4})/g; // Example regex pattern for Project Title | Skills | Date
  let projects = [];
  let match;

  while ((match = projectPattern.exec(text)) !== null) {
    const projectTitle = match[1].trim();
    const skillsUsed = match[2].trim();
    const year = match[3].trim();
    
    projects.push({ title: projectTitle, skillsUsed: skillsUsed, year });
  }

  return projects;
};




const checkSkillsInSection = (text, skill, label, scoreValue) => {
  const sectionPattern = new RegExp(`${label}[\\s\\S]*?(?=Education|Projects|Certifications|$)`, 'i');
  const sectionMatch = text.match(sectionPattern);

  if (sectionMatch && sectionMatch[0].toLowerCase().includes(skill.toLowerCase())) {
    console.log(`${skill}: Detected skill in ${label}, adding ${scoreValue}% score`);
    return scoreValue;
  }

  return 0;
};


// Function to calculate the score based on skills, projects, and certifications
// Function to calculate the score based on skills, projects, and certifications
const calculateScore = (skillsDetected, projects, certifications, text,selectedSkillsScore,selectedSubSkillScore,selectedProjectScore,selectedCertificateScore) => {
  let skillScores = {};
  let totalScore = 0;

  console.log("------------------------------------------------------------");

  requiredSkills.forEach((skill, index) => {
    const skillLower = skill.toLowerCase();
    let skillScore = 0;

 


    console.log("*****************************************");
    
 
    // Check if the primary skill is detected
    const isSkillDetected = skillsDetected.some(s => s.toLowerCase() === skillLower);
    
    
    if (isSkillDetected) {
      const scoreToAdd = selectedSkillsScore; // Use the frontend-provided score or default to 10%
      skillScore += scoreToAdd;
      console.log(`${skill}: Detected skill, adding ${scoreToAdd}% score`);
    }

    skillScore += checkSkillsInSection(text, skill, "Experience Summary", 20); // Add 10% for Experience Summary
    skillScore += checkSkillsInSection(text, skill, "Professional Experience", 20); // Add 20% for Professional Experience
    skillScore += checkSkillsInSection(text, skill, "Work Experience", 20); // Add 20% for Professional Experience

    // Check for subskills and add score for each found
    const subskillsDetected = extractSubskills(text, skill);
    if (subskillsDetected.length > 0) {
      subskillsDetected.forEach(subskill => {
        skillScore += selectedSubSkillScore; // Add 10% for each subskill detected
        console.log(`${skill}: Detected subskill "${subskill}", adding ${selectedSubSkillScore} score`);
      });
    }

    // Check if any projects mention this skill or any of its subskills
    projects.forEach(project => {
      const projectDescription = `${project.title} ${project.skillsUsed} ${project.description}`.toLowerCase();

      let projectMatchFound = false;

      // Check for skill or any subskill in the project description and skills used
      if (
        subskillsDetected.some(subskill => projectDescription.includes(subskill.toLowerCase())) ||
        projectDescription.includes(skillLower)
      ) {
        projectMatchFound = true;
        console.log(`${skill}: Detected relevant skill or subskill in project "${project.title}", adding ${selectedProjectScore || 0} score from project`);
      }

      if (projectMatchFound) {
        skillScore += selectedProjectScore || 0; // Relevant project skill match
      }
    });

    // Only add project and certification points if skill is detected
    if (skillScore > 0) {
      if (certifications.some(cert => cert.toLowerCase().includes(skillLower))) {
        skillScore += selectedCertificateScore || 0; // Relevant certification
        console.log(`${skill}: Detected relevant certification, adding ${selectedCertificateScore || 0} score`);
      }
    }

    // Cap the skill score at 100%  
    skillScores[skill] = Math.min(skillScore, 100);
    totalScore += skillScores[skill];

    // Log the score for the current skill
    console.log(`${skill}: Total score for this skill: ${skillScores[skill]}%`);
  });

  // Cap the total score at 100%
  totalScore = Math.min(totalScore, 100);
  console.log(`Total score for all skills: ${totalScore}%`);
  return { skillScores, totalScore };
};



const extractEducationPercentages = (text) => {
  // Define patterns for each education level with the required constraints
  const educationPatterns = [
    {
      level: '10th',
      pattern: /(Matric|Senior\s*Secondary|10th)[^10th12thUGPG]*?(\b(?:\d{1,2}(?:\.\d{1,2})?|100)%)/i, // Accept percentages only
    },
    {
      level: '12th',
      pattern: /(Higher\s*Secondary|10\+2|12th)[^10th12thUGPG]*?(\b(?:\d{1,2}(?:\.\d{1,2})?|100)%)/i, // Accept percentages only
    },
    { level: 'UG', pattern: /(Bachelor[\s\S]*?)(\d{2,3}[%]|(?:\d\.\d{1,2})\s*CGPA)/i },
    { level: 'PG', pattern: /(Master[\s\S]*?)(\d{2,3}[%]|(?:\d\.\d{1,2})\s*CGPA)/i },
  ];

  const educationPercentages = {};

  educationPatterns.forEach(({ level, pattern }) => {
    const match = text.match(pattern);
    if (match) {
      educationPercentages[level] = match[2].trim(); // Capture the valid percentage or CGPA and trim whitespace
    } else {
      educationPercentages[level] = "Not Mentioned"; // If no valid match found, return "Not Mentioned"
    }
  });

  return educationPercentages;
};


// Route for handling resume upload
app.post('/upload', upload.single('resume'), (req, res) => {
  const filePath = req.file.path;
  let text = '';

  // Extract and parse the `data` object from the front-end
  const frontEndData = req.body.data ? JSON.parse(req.body.data) : {};
  const selectedSkills = frontEndData.selectedSkills || [];
  const selectedSubSkill = frontEndData.subskills || [];
  skillSubskills = selectedSubSkill
  const selectedSkillsScore = frontEndData.skillScore;
  const selectedSubSkillScore = frontEndData.subSkillScore;
  const selectedProjectScore = frontEndData.projectScore;
  const selectedCertificateScore = frontEndData.certificateScore;





  // Update the requiredSkills array with the selectedSkills from the front-end
  if (selectedSkills.length > 0) {
    requiredSkills = selectedSkills;
  }

  if (req.file.mimetype === 'application/pdf') {
    const pdfBuffer = fs.readFileSync(filePath);
    pdfParse(pdfBuffer)
      .then(data => {
        text = data.text;

        if (selectedSkills.length > 0) {
          requiredSkills = selectedSkills; // Update global `requiredSkills` array
        }



        // const skillsDetected = extractSkills(text);
        const skillsDetected = extractSkills(text, selectedSkills);


        const certifications = extractCertifications(text);
        const name = extractName(text);
        const email = extractEmail(text);
        const phone = extractPhone(text);
        const college = extractCollege(text);
        
        // Extract education percentages (10th, 12th, UG, PG)
        const educationPercentages = extractEducationPercentages(text);

        // Extract projects from the resume
        const projects = extractProjects(text);

        const { skillScores, totalScore } = calculateScore(skillsDetected, projects, certifications, text,selectedSkillsScore,selectedSubSkillScore,selectedProjectScore,selectedCertificateScore);

        res.json({
          text,
          skillScores,
          totalScore,
          name,
          email,
          phone,
          college,
          certifications,
          educationPercentages, // Include the education percentages in the response
        });
      })
      .catch(error => res.status(500).json({ error: 'Error parsing PDF' }));
  } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    textract.fromFileWithPath(filePath, (error, text) => {
      if (error) {
        return res.status(500).json({ error: 'Error extracting text from DOCX file' });
      }

      const skillsDetected = extractSkills(text);
      const certifications = extractCertifications(text);
      const name = extractName(text);
      const email = extractEmail(text);
      const phone = extractPhone(text);
      const college = extractCollege(text);
      
      // Extract education percentages (10th, 12th, UG, PG)
      const educationPercentages = extractEducationPercentages(text);

      // Extract projects from the resume
      const projects = extractProjects(text);

      const { skillScores, totalScore } = calculateScore(skillsDetected, projects, certifications, text);

      res.json({
        text,
        skillScores,
        totalScore,
        name,
        email,
        phone,
        college,
        certifications,
        educationPercentages, // Include the education percentages in the response
      });
    });
  } else {
    res.status(400).json({ error: 'Invalid file type. Only PDF and DOCX are supported.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
