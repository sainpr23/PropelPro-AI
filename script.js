// ===================================================
// PropelPro AI — script.js
// Handles: Proposal Generation, Executive Summary,
//          Risks & Assumptions, Version Comparison
// ===================================================

// Stores the last generated proposal (for version compare)
let previousProposal = "";
let currentProposal  = "";

// ===================================================
// UTILITY: Toggle chip selection
// ===================================================
function toggleChip(chip) {
  chip.classList.toggle("active");
}

// ===================================================
// UTILITY: Update budget slider display
// ===================================================
function updateBudget(value) {
  const formatted = Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
  document.getElementById("budgetDisplay").textContent = formatted;
}

// ===================================================
// UTILITY: Get all active chips from a container
// ===================================================
function getActiveChips(containerId) {
  const chips = document.querySelectorAll(`#${containerId} .chip.active`);
  return Array.from(chips).map(c => c.textContent.trim());
}

// ===================================================
// UTILITY: Set status bar message
// ===================================================
function setStatus(message, state = "idle") {
  const dot  = document.getElementById("statusBar").querySelector(".status-dot");
  const text = document.getElementById("statusText");

  text.textContent = message;
  dot.className    = "status-dot";

  if (state === "loading") dot.classList.add("loading");
  if (state === "error")   dot.classList.add("error");
}

// ===================================================
// UTILITY: Show output in the right panel
// ===================================================
function showOutput(htmlContent) {
  const box = document.getElementById("outputBox");
  box.innerHTML = htmlContent;
}

// ===================================================
// UTILITY: Call Gemini API
// ===================================================
async function callGemini(prompt) {
  const apiKey = document.getElementById("apiKey").value.trim();

  if (!apiKey) {
    alert("Please paste your Gemini API key first!");
    return null;
  }

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log("Gemini response:", data); // 🔥 IMPORTANT

  if (!response.ok) {
    throw new Error(data.error?.message || "API call failed");
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}

// ===================================================
// UTILITY: Convert markdown-like text to HTML
// ===================================================
function formatToHTML(text) {
  return text
    // H1
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // H2
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    // H3
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Bullet points
    .replace(/^\* (.+)$/gm, "<li>$1</li>")
    .replace(/^- (.+)$/gm,  "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
    // Paragraphs: wrap lines that are not tags
    .replace(/^(?!<[hul]|<\/[ul])(.+)$/gm, "<p>$1</p>")
    // Clean up blank lines
    .replace(/\n{2,}/g, "\n");
}

// ===================================================
// FEATURE 1: Generate Full Proposal
// ===================================================
async function generateProposal() {
  // Read all form values
  const apiKey      = document.getElementById("apiKey").value.trim();
  const clientName  = document.getElementById("clientName").value.trim();
  const contact     = document.getElementById("contactPerson").value.trim();
  const industry    = document.getElementById("industry").value;
  const companySize = document.getElementById("companySize").value;
  const projectDesc = document.getElementById("projectDesc").value.trim();
  const budget      = document.getElementById("budgetSlider").value;
  const duration    = document.getElementById("duration").value;
  const tone        = document.getElementById("tone").value;

  const services = getActiveChips("servicesChips");
  const sections = getActiveChips("sectionsChips");

  // Basic validation
  if (!apiKey) {
    alert("Please enter your Gemini API key!");
    return;
  }
  if (!clientName) {
    alert("Please enter the client name!");
    return;
  }
  if (!projectDesc) {
    alert("Please describe the project!");
    return;
  }

  // Show loading state
  setStatus("Generating proposal... please wait", "loading");
  document.querySelector(".btn-primary").disabled = true;
  showOutput("<div class='output-placeholder'><div class='placeholder-icon'>⏳</div><div>AI is writing your proposal...</div></div>");

  // Build the prompt
  const prompt = `
You are an expert sales proposal writer. Write a complete, professional sales proposal using the details below.

CLIENT DETAILS:
- Company: ${clientName}
- Contact: ${contact || "Not specified"}
- Industry: ${industry || "Not specified"}
- Company size: ${companySize || "Not specified"}

PROJECT DETAILS:
- Description / Pain points: ${projectDesc}
- Services included: ${services.length > 0 ? services.join(", ") : "General services"}
- Budget: $${Number(budget).toLocaleString()}
- Duration: ${duration}

PROPOSAL SETTINGS:
- Tone: ${tone}
- Sections to include: ${sections.join(", ")}

INSTRUCTIONS:
- Write each section with a clear heading using ## for section titles
- Use the exact tone specified
- Be specific to the client's industry and pain points
- Make it sound human, professional, and persuasive
- Use bullet points where appropriate
- Include realistic numbers and timeframes based on the budget and duration
- Start the proposal with a title using # 

Write the full proposal now:
`;

  try {
    const result = await callGemini(prompt);

    // Save for version comparison
    previousProposal = currentProposal;
    currentProposal  = result;

    // Display
    showOutput(formatToHTML(result));
    setStatus("Proposal generated successfully!", "idle");

    // Show action buttons
    document.getElementById("actionRow").style.display = "flex";

  } catch (error) {
    setStatus("Error: " + error.message, "error");
    showOutput("<div class='output-placeholder'><div class='placeholder-icon'>❌</div><div>Something went wrong. Check your API key and try again.</div></div>");
  }

  document.querySelector(".btn-primary").disabled = false;
}

// ===================================================
// FEATURE 2: Regenerate Executive Summary
// ===================================================
async function generateExecutiveSummary() {
  if (!currentProposal) {
    alert("Please generate a proposal first!");
    return;
  }

  setStatus("Regenerating executive summary...", "loading");

  const prompt = `
You are an expert business writer. Based on the following sales proposal, write a compelling Executive Summary.

PROPOSAL:
${currentProposal}

INSTRUCTIONS:
- Keep it to 3–4 short paragraphs
- Start with the client's key challenge
- Explain the proposed solution briefly
- End with the value/outcome the client will achieve
- Use a professional tone
- Use ## Executive Summary as the heading

Write only the Executive Summary:
`;

  try {
    const result = await callGemini(prompt);
    showOutput(formatToHTML(result));
    setStatus("Executive summary regenerated!", "idle");
  } catch (error) {
    setStatus("Error: " + error.message, "error");
  }
}

// ===================================================
// FEATURE 3: Regenerate Risks & Assumptions
// ===================================================
async function generateRisks() {
  if (!currentProposal) {
    alert("Please generate a proposal first!");
    return;
  }

  setStatus("Drafting risks & assumptions...", "loading");

  const prompt = `
You are an expert project risk analyst. Based on the following sales proposal, write a detailed Risks & Assumptions section.

PROPOSAL:
${currentProposal}

INSTRUCTIONS:
- List at least 5 realistic risks with their impact level (Low / Medium / High)
- List at least 5 assumptions made in this proposal
- Format risks as: Risk name | Impact: High/Medium/Low | Mitigation strategy
- Format assumptions as a numbered list
- Use ## Risks & Assumptions as the main heading
- Use ### Risks and ### Assumptions as subheadings

Write only the Risks & Assumptions section:
`;

  try {
    const result = await callGemini(prompt);
    showOutput(formatToHTML(result));
    setStatus("Risks & assumptions drafted!", "idle");
  } catch (error) {
    setStatus("Error: " + error.message, "error");
  }
}

// ===================================================
// FEATURE 4: Compare Versions
// ===================================================
function compareVersions() {
  if (!previousProposal) {
    alert("No previous version found. Generate the proposal at least twice to compare versions!");
    return;
  }

  setStatus("Comparing versions...", "idle");

  // Split both versions into lines
  const oldLines = previousProposal.split("\n");
  const newLines = currentProposal.split("\n");

  let diffHTML = "<h2 style='color:#185FA5; margin-bottom:16px;'>Version Comparison</h2>";
  diffHTML += "<p style='color:#718096; margin-bottom:20px; font-size:13px;'>Green = added in new version &nbsp;|&nbsp; Red = removed from old version</p>";

  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";

    if (oldLine === newLine) {
      // Same line — show normally
      if (newLine.trim() !== "") {
        diffHTML += `<p>${newLine}</p>`;
      }
    } else {
      // Different — show removed and added
      if (oldLine.trim() !== "") {
        diffHTML += `<p><span class="compare-removed">${oldLine}</span></p>`;
      }
      if (newLine.trim() !== "") {
        diffHTML += `<p><span class="compare-added">${newLine}</span></p>`;
      }
    }
  }

  showOutput(diffHTML);
  setStatus("Showing version differences", "idle");
}

// ===================================================
// FEATURE 5: Copy proposal text to clipboard
// ===================================================
function copyProposal() {
  if (!currentProposal) {
    alert("No proposal to copy yet!");
    return;
  }

  navigator.clipboard.writeText(currentProposal).then(() => {
    setStatus("Proposal copied to clipboard!", "idle");
  }).catch(() => {
    alert("Could not copy. Please select the text manually.");
  });
}