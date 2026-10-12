const API = "http://localhost:8080/api";

const $ = id => document.getElementById(id);

const state = {
    members: [],
    trainers: [],
    attendance: [],
    vitals: [],
    diet: [],
    workouts: [],
    equipment: []
};

const configs = {
    members: {
        endpoint: "members",
        body: "membersTable",
        columns: ["member_id", "name", "dob", "gender", "trainer_id"],
        form: [
            ["name", "Member name", "text", true],
            ["dob", "Date of birth", "date", false],
            ["gender", "Gender", "select", false, ["Male", "Female", "Other"]],
            ["trainer_id", "Trainer ID", "number", false]
        ]
    },

    trainers: {
        endpoint: "trainers",
        body: "trainersTable",
        columns: ["trainer_id", "name", "experience", "gender"],
        form: [
            ["name", "Trainer name", "text", true],
            ["experience", "Experience in years", "number", false],
            ["gender", "Gender", "select", false, ["Male", "Female", "Other"]]
        ]
    },

    attendance: {
        endpoint: "attendance",
        body: "attendanceTable",
        columns: ["member_id", "attendance_date", "status"],
        form: [
            ["member_id", "Member ID", "number", true],
            ["attendance_date", "Date", "date", true],
            ["status", "Status", "select", true, ["Present", "Absent", "Late"]]
        ]
    },

    vitals: {
        endpoint: "vitals",
        body: "vitalsTable",
        columns: ["member_id", "recorded_date", "weight", "height", "progress"],
        form: [
            ["member_id", "Member ID", "number", true],
            ["recorded_date", "Recorded date", "date", true],
            ["weight", "Weight in kg", "number", false],
            ["height", "Height in cm", "number", false],
            ["progress", "Progress notes", "text", false]
        ]
    },

    diet: {
        endpoint: "diet-plans",
        body: "dietTable",
        columns: ["diet_id", "diet_name", "goal", "duration", "calories", "member_id", "trainer_id"],
        form: [
            ["diet_name", "Diet name", "text", true],
            ["goal", "Goal", "text", false],
            ["duration", "Duration", "text", false],
            ["calories", "Calories", "number", false],
            ["member_id", "Member ID", "number", false],
            ["trainer_id", "Trainer ID", "number", false]
        ]
    },

    workouts: {
        endpoint: "workout-plans",
        body: "workoutsTable",
        columns: ["workout_id", "workout_name", "goal", "difficulty_level", "member_id", "trainer_id"],
        form: [
            ["workout_name", "Workout name", "text", true],
            ["goal", "Goal", "text", false],
            ["difficulty_level", "Difficulty", "select", false, ["Beginner", "Intermediate", "Advanced"]],
            ["member_id", "Member ID", "number", false],
            ["trainer_id", "Trainer ID", "number", false]
        ]
    },

    equipment: {
        endpoint: "equipment",
        body: "equipmentTable",
        columns: ["equipment_id", "equipment_name", "exercise_purpose"],
        form: [
            ["equipment_name", "Equipment name", "text", true],
            ["exercise_purpose", "Exercise purpose", "text", false]
        ]
    }
};

function displayValue(value) {
    return value === null || value === undefined || value === ""
        ? "—"
        : String(value);
}

function createCell(value) {
    const td = document.createElement("td");
    td.textContent = displayValue(value);
    return td;
}

function renderTable(config, records, targetId = config.body) {
    const tbody = $(targetId);
    tbody.replaceChildren();

    if (!records || records.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell("No records found");
        cell.colSpan = config.columns.length;
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    records.forEach(record => {
        const row = document.createElement("tr");

        config.columns.forEach(column => {
            row.appendChild(createCell(record[column]));
        });

        tbody.appendChild(row);
    });
}

async function getData(endpoint) {
    const response = await fetch(`${API}/${endpoint}`);

    if (!response.ok) {
        throw new Error(`Unable to load ${endpoint}`);
    }

    return response.json();
}

async function loadData() {
    try {
        const [
            members,
            trainers,
            attendance,
            vitals,
            diet,
            workouts,
            equipment
        ] = await Promise.all([
            getData("members"),
            getData("trainers"),
            getData("attendance"),
            getData("vitals"),
            getData("diet-plans"),
            getData("workout-plans"),
            getData("equipment")
        ]);

        Object.assign(state, {
            members,
            trainers,
            attendance,
            vitals,
            diet,
            workouts,
            equipment
        });

        renderTable(configs.members, members);
        renderTable(configs.trainers, trainers);
        renderTable(configs.attendance, attendance);
        renderTable(configs.vitals, vitals);
        renderTable(configs.diet, diet);
        renderTable(configs.workouts, workouts);
        renderTable(configs.equipment, equipment);

        $("memberCount").textContent = members.length;
        $("trainerCount").textContent = trainers.length;
        $("attendanceCount").textContent = attendance.length;
        $("equipmentCount").textContent = equipment.length;

        renderTable(
            configs.members,
            members.slice(-5).reverse(),
            "recentMembers"
        );

        console.log("Database records loaded successfully.");

    } catch (error) {
        console.error(error);
        alert(
            "Could not load data. Make sure your Java backend is running."
        );
    }
}

/* SIDEBAR NAVIGATION */

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        const page = button.dataset.page;

        document.querySelectorAll(".page").forEach(section => {
            section.classList.toggle(
                "active",
                section.id === page
            );
        });

        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.toggle("active", item === button);
        });

        $("pageTitle").textContent =
            button.textContent.trim();
    });
});

/* DARK MODE */

$("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");

    $("themeToggle").textContent =
        dark ? "☀ Light Mode" : "🌙 Dark Mode";
});

/* MEMBER SEARCH */

$("memberSearch").addEventListener("input", event => {
    const query = event.target.value.toLowerCase();

    const filtered = state.members.filter(member =>
        String(member.name || "").toLowerCase().includes(query) ||
        String(member.member_id || "").includes(query)
    );

    renderTable(configs.members, filtered);
});

/* ADD RECORD FORMS */

let activeForm = null;

const buttonMap = {
    addMemberButton: "members",
    addTrainerButton: "trainers",
    addAttendanceButton: "attendance",
    addVitalsButton: "vitals",
    addDietButton: "diet",
    addWorkoutButton: "workouts",
    addEquipmentButton: "equipment"
};

function openForm(key) {
    activeForm = key;

    const config = configs[key];
    const container = $("formFields");

    container.replaceChildren();
    $("formError").textContent = "";

    $("dialogTitle").textContent =
        "Add " + key.replace("-", " ");

    config.form.forEach(([name, label, type, required, options]) => {
        const wrapper = document.createElement("label");
        wrapper.textContent = label;

        let input;

        if (type === "select") {
            input = document.createElement("select");
            input.add(new Option("Select...", ""));

            options.forEach(option => {
                input.add(new Option(option, option));
            });
        } else {
            input = document.createElement("input");
            input.type = type;
        }

        input.name = name;
        input.required = required;

        wrapper.appendChild(input);
        container.appendChild(wrapper);
    });

    $("recordDialog").showModal();
}

Object.entries(buttonMap).forEach(([buttonId, key]) => {
    $(buttonId).addEventListener("click", () => openForm(key));
});

$("cancelDialog").addEventListener("click", () => {
    $("recordDialog").close();
});

async function saveRecord(endpoint, data) {
    const response = await fetch(`${API}/${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Unable to save record");
    }

    return result;
}

$("recordForm").addEventListener("submit", async event => {
    event.preventDefault();

    const config = configs[activeForm];
    const data = {};

    new FormData(event.target).forEach((value, key) => {
        if (value !== "") {
            data[key] = value;
        }
    });

    try {
        await saveRecord(config.endpoint, data);

        $("recordDialog").close();
        event.target.reset();

        await loadData();

        alert("Record saved successfully!");

    } catch (error) {
        $("formError").textContent = error.message;
    }
});

/* START */

loadData();