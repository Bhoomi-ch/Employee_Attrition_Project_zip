from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import os

app = Flask(__name__)

FILE = "dataset.csv"


# Generate sample employee dataset
def create_dataset():
    np.random.seed(42)

    departments = ["IT", "HR", "Sales", "Finance", "Marketing"]
    genders = ["Male", "Female"]
    reasons = [
        "Low Salary",
        "Work Pressure",
        "Better Opportunity",
        "Personal Reasons",
        "No Promotion"
    ]

    records = []

    for i in range(1, 151):
        status = np.random.choice(["Yes", "No"], p=[0.25, 0.75])

        records.append({
            "EmployeeID": f"EMP{i:03}",
            "Name": f"Employee {i}",
            "Age": int(np.random.randint(21, 56)),
            "Gender": np.random.choice(genders),
            "Department": np.random.choice(departments),
            "Salary": int(np.random.randint(20000, 90000)),
            "Satisfaction": int(np.random.randint(1, 6)),
            "Overtime": np.random.choice(["Yes", "No"]),
            "Attrition": status,
            "Reason": np.random.choice(reasons) if status == "Yes" else "-"
        })

    pd.DataFrame(records).to_csv(FILE, index=False)


def get_data():
    if not os.path.exists(FILE):
        create_dataset()

    return pd.read_csv(FILE).fillna("")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/dashboard")
def dashboard():
    df = get_data()

    total = len(df)
    left = int((df["Attrition"] == "Yes").sum())
    active = total - left
    rate = round((left / total) * 100, 1) if total else 0

    department_data = (
        df[df["Attrition"] == "Yes"]["Department"]
        .value_counts().to_dict()
    )

    reason_data = (
        df[df["Attrition"] == "Yes"]["Reason"]
        .value_counts().to_dict()
    )

    gender_data = df["Gender"].value_counts().to_dict()

    overtime_data = {}
    for value in ["Yes", "No"]:
        group = df[df["Overtime"] == value]
        overtime_data[value] = round(
            (group["Attrition"] == "Yes").mean() * 100, 1
        ) if len(group) else 0

    satisfaction_data = {}
    for value in range(1, 6):
        group = df[df["Satisfaction"] == value]
        satisfaction_data[str(value)] = round(
            (group["Attrition"] == "Yes").mean() * 100, 1
        ) if len(group) else 0

    return jsonify({
        "total": total,
        "active": active,
        "left": left,
        "rate": rate,
        "employees": df.to_dict(orient="records"),
        "departments": department_data,
        "reasons": reason_data,
        "genders": gender_data,
        "overtime": overtime_data,
        "satisfaction": satisfaction_data
    })


@app.route("/api/employee", methods=["POST"])
def add_employee():
    df = get_data()
    data = request.get_json(silent=True) or {}

    required = [
        "Name", "Age", "Gender", "Department",
        "Salary", "Satisfaction", "Overtime", "Attrition"
    ]

    if any(not str(data.get(key, "")).strip() for key in required):
        return jsonify({"error": "Please fill all required fields."}), 400

    try:
        age = int(data["Age"])
        salary = int(data["Salary"])
        satisfaction = int(data["Satisfaction"])
    except (ValueError, TypeError):
        return jsonify({"error": "Enter valid numeric values."}), 400

    if not 18 <= age <= 65 or salary <= 0 or not 1 <= satisfaction <= 5:
        return jsonify({"error": "Please enter valid employee details."}), 400

    if data["Gender"] not in ["Male", "Female"]:
        return jsonify({"error": "Invalid gender."}), 400

    if data["Department"] not in [
        "IT", "HR", "Sales", "Finance", "Marketing"
    ]:
        return jsonify({"error": "Invalid department."}), 400

    if data["Overtime"] not in ["Yes", "No"]:
        return jsonify({"error": "Invalid overtime value."}), 400

    if data["Attrition"] not in ["Yes", "No"]:
        return jsonify({"error": "Invalid attrition status."}), 400

    reason = data.get("Reason", "").strip()

    if data["Attrition"] == "Yes" and not reason:
        return jsonify({"error": "Please select a leaving reason."}), 400

    existing_ids = df["EmployeeID"].astype(str).tolist()
    numbers = [
        int(value[3:]) for value in existing_ids
        if value.startswith("EMP") and value[3:].isdigit()
    ]

    new_id = f"EMP{max(numbers, default=0) + 1:03}"

    new_employee = {
        "EmployeeID": new_id,
        "Name": data["Name"].strip(),
        "Age": age,
        "Gender": data["Gender"],
        "Department": data["Department"],
        "Salary": salary,
        "Satisfaction": satisfaction,
        "Overtime": data["Overtime"],
        "Attrition": data["Attrition"],
        "Reason": reason if data["Attrition"] == "Yes" else "-"
    }

    df = pd.concat(
        [df, pd.DataFrame([new_employee])],
        ignore_index=True
    )

    df.to_csv(FILE, index=False)

    return jsonify({"message": "Employee added successfully!"})


@app.route("/api/employee/<employee_id>", methods=["DELETE"])
def delete_employee(employee_id):
    df = get_data()

    if employee_id not in df["EmployeeID"].values:
        return jsonify({"error": "Employee not found."}), 404

    df = df[df["EmployeeID"] != employee_id]
    df.to_csv(FILE, index=False)

    return jsonify({"message": "Employee deleted successfully!"})


if __name__ == "__main__":
    app.run(debug=True)