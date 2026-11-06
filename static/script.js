let employees = [];
let charts = {};

async function loadDashboard() {
    try {
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
            throw new Error("Dashboard data could not load");
        }

        const data = await response.json();

        document.getElementById("total").textContent = data.total;
        document.getElementById("active").textContent = data.active;
        document.getElementById("left").textContent = data.left;
        document.getElementById("rate").textContent = data.rate + "%";

        employees = data.employees;

        createChart("departmentChart", "bar",
            data.departments, "Employees Left");

        createChart("reasonChart", "doughnut",
            data.reasons, "Leaving Reasons");

        createChart("genderChart", "pie",
            data.genders, "Gender");

        createChart("overtimeChart", "bar",
            data.overtime, "Attrition Rate (%)");

        createChart("satisfactionChart", "line",
            data.satisfaction, "Attrition Rate (%)");

        filterEmployees();

    } catch (error) {
        console.error(error);

        document.getElementById("message").textContent =
            "Dashboard loading failed. Check Python server.";
    }
}


function createChart(id, type, values, label) {
    const canvas = document.getElementById(id);

    if (charts[id]) {
        charts[id].destroy();
    }

    charts[id] = new Chart(canvas, {
        type: type,

        data: {
            labels: Object.keys(values),

            datasets: [{
                label: label,
                data: Object.values(values),

                backgroundColor: [
                    "#2563eb",
                    "#06b6d4",
                    "#8b5cf6",
                    "#f59e0b",
                    "#10b981"
                ],

                borderColor: "#2563eb",
                borderWidth: 2,
                tension: 0.3
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    display: type !== "bar" && type !== "line"
                }
            },

            scales: (type === "bar" || type === "line")
                ? { y: { beginAtZero: true } }
                : {}
        }
    });
}


function showEmployees(list) {
    const table = document.getElementById("employeeTable");

    table.replaceChildren();

    list.forEach(emp => {
        const row = document.createElement("tr");

        [
            "EmployeeID",
            "Name",
            "Age",
            "Gender",
            "Department",
            "Salary",
            "Attrition"
        ].forEach(key => {
            const cell = document.createElement("td");
            cell.textContent = emp[key];
            row.appendChild(cell);
        });

        const action = document.createElement("td");
        const button = document.createElement("button");

        button.textContent = "Delete";
        button.className = "delete-btn";

        button.addEventListener("click", () => {
            deleteEmployee(emp.EmployeeID);
        });

        action.appendChild(button);
        row.appendChild(action);

        table.appendChild(row);
    });
}


async function deleteEmployee(id) {
    if (!confirm("Do you want to delete this employee?")) {
        return;
    }

    try {
        const response = await fetch(
            "/api/employee/" + encodeURIComponent(id),
            { method: "DELETE" }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);
        }

        loadDashboard();

    } catch (error) {
        alert(error.message);
    }
}


document.getElementById("attrition").addEventListener("change", function() {
    const reason = document.getElementById("reason");

    reason.classList.toggle("hidden", this.value !== "Yes");
    reason.required = this.value === "Yes";

    if (this.value !== "Yes") {
        reason.value = "";
    }
});


document.getElementById("employeeForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const employee = {
        Name: document.getElementById("name").value,
        Age: document.getElementById("age").value,
        Gender: document.getElementById("gender").value,
        Department: document.getElementById("department").value,
        Salary: document.getElementById("salary").value,
        Satisfaction: document.getElementById("satisfaction").value,
        Overtime: document.getElementById("overtime").value,
        Attrition: document.getElementById("attrition").value,
        Reason: document.getElementById("reason").value
    };

    try {
        const response = await fetch("/api/employee", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(employee)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);
        }

        const message = document.getElementById("message");

        message.textContent = result.message;
        message.style.color = "green";

        this.reset();

        document.getElementById("reason").classList.add("hidden");
        document.getElementById("reason").required = false;

        loadDashboard();

    } catch (error) {
        const message = document.getElementById("message");

        message.textContent = error.message;
        message.style.color = "red";
    }
});


function filterEmployees() {
    const search = document.getElementById("search").value.toLowerCase();
    const department = document.getElementById("filterDepartment").value;

    const filtered = employees.filter(emp => {
        const matchesSearch =
            emp.Name.toLowerCase().includes(search) ||
            emp.EmployeeID.toLowerCase().includes(search);

        const matchesDepartment =
            department === "" || emp.Department === department;

        return matchesSearch && matchesDepartment;
    });

    showEmployees(filtered);
}


document.getElementById("search").addEventListener("input", filterEmployees);

document.getElementById("filterDepartment").addEventListener(
    "change", filterEmployees
);


document.getElementById("downloadBtn").addEventListener("click", function() {
    if (employees.length === 0) {
        alert("No employee data available.");
        return;
    }

    const headers = Object.keys(employees[0]);

    const rows = employees.map(emp =>
        headers.map(key =>
            '"' + String(emp[key] ?? "").replace(/"/g, '""') + '"'
        ).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "employee_data.csv";
    link.click();

    URL.revokeObjectURL(link.href);
});


loadDashboard();