import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

os.makedirs("datasets/samples", exist_ok=True)
np.random.seed(42)
random.seed(42)

# 1. Sales Dataset (500 rows)
print("Generating sales.csv...")
regions = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]
categories = ["Electronics", "Home & Kitchen", "Office Supplies", "Apparel", "Industrial Tools"]
start_date = datetime(2024, 1, 1)

sales_data = []
for i in range(500):
    date = start_date + timedelta(days=int(i * 0.72) + random.randint(0, 2))
    region = random.choice(regions)
    category = random.choice(categories)
    units = random.randint(1, 80)
    unit_price = round(random.uniform(15.0, 450.0), 2)
    discount = round(random.choice([0.0, 0.05, 0.10, 0.15, 0.20, 0.25]), 2)
    revenue = round(units * unit_price * (1 - discount), 2)
    cost = round(units * unit_price * 0.55, 2)
    profit = round(revenue - cost, 2)
    sales_data.append({
        "Date": date.strftime("%Y-%m-%d"),
        "Region": region,
        "Product_Category": category,
        "Sales_Units": units,
        "Unit_Price": unit_price,
        "Discount_Pct": discount,
        "Revenue": revenue,
        "Profit": profit
    })
df_sales = pd.DataFrame(sales_data)
df_sales.to_csv("datasets/samples/sales.csv", index=False)

# 2. Students Dataset (350 rows)
print("Generating students.csv...")
depts = ["Computer Science", "Electrical Eng", "Mechanical Eng", "Data Science", "Business Admin"]
grades_map = ["A", "A-", "B+", "B", "B-", "C+", "C", "F"]

students_data = []
for i in range(350):
    dept = random.choice(depts)
    semester = random.randint(1, 8)
    study_hours = round(np.clip(np.random.normal(18, 6), 4, 40), 1)
    attendance = round(np.clip(np.random.normal(82, 10), 45, 100), 1)
    assignment = round(np.clip(study_hours * 1.5 + attendance * 0.4 + np.random.normal(15, 5), 30, 100), 1)
    exam = round(np.clip(study_hours * 1.6 + attendance * 0.35 + np.random.normal(12, 6), 25, 100), 1)
    cgpa = round(np.clip((assignment * 0.4 + exam * 0.6) / 25.0 + np.random.normal(0, 0.15), 1.5, 4.0), 2)
    
    if cgpa >= 3.7:
        grade = "A"
    elif cgpa >= 3.3:
        grade = "A-"
    elif cgpa >= 3.0:
        grade = "B+"
    elif cgpa >= 2.7:
        grade = "B"
    elif cgpa >= 2.3:
        grade = "B-"
    elif cgpa >= 2.0:
        grade = "C"
    else:
        grade = "F"

    students_data.append({
        "StudentID": f"STD-{1000 + i}",
        "Department": dept,
        "Semester": semester,
        "Attendance_Pct": attendance,
        "Study_Hours_Per_Week": study_hours,
        "Assignment_Score": assignment,
        "Exam_Score": exam,
        "CGPA": cgpa,
        "Grade": grade
    })
df_students = pd.DataFrame(students_data)
df_students.to_csv("datasets/samples/students.csv", index=False)

# 3. Employees Dataset (400 rows)
print("Generating employees.csv...")
roles = {
    "Engineering": ["Software Engineer", "DevOps Engineer", "QA Engineer", "Engineering Manager"],
    "Sales": ["Account Executive", "Sales Representative", "Sales Lead"],
    "Marketing": ["Content Strategist", "Growth Specialist", "Marketing Director"],
    "HR": ["HR Generalist", "Talent Specialist", "HR Director"],
    "Finance": ["Financial Analyst", "Staff Accountant", "Finance Controller"]
}
education_levels = ["Bachelors", "Masters", "PhD", "Associate"]

employees_data = []
for i in range(400):
    dept = random.choice(list(roles.keys()))
    role = random.choice(roles[dept])
    exp = random.randint(1, 25)
    edu = random.choice(education_levels)
    base_salary = int(45000 + exp * 3400 + (12000 if edu == "Masters" else 22000 if edu == "PhD" else 0) + np.random.normal(0, 4000))
    rating = random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.15, 0.45, 0.25, 0.10])[0]
    bonus_pct = 0.04 * rating + (0.05 if "Manager" in role or "Director" in role or "Lead" in role else 0.0)
    bonus = round(base_salary * bonus_pct, 2)
    overtime = random.randint(0, 35) if rating > 2 else random.randint(0, 10)

    employees_data.append({
        "EmployeeID": f"EMP-{2000 + i}",
        "Department": dept,
        "JobRole": role,
        "Years_Experience": exp,
        "Education_Level": edu,
        "Base_Salary": base_salary,
        "Bonus": bonus,
        "Performance_Rating": rating,
        "Overtime_Hours": overtime
    })
df_emp = pd.DataFrame(employees_data)
df_emp.to_csv("datasets/samples/employees.csv", index=False)

# 4. Ecommerce Dataset (600 rows)
print("Generating ecommerce.csv...")
segments = ["Consumer", "Corporate", "Small Business"]
devices = ["Desktop", "Mobile Web", "iOS App", "Android App"]
payments = ["Credit Card", "PayPal", "Apple Pay", "Buy Now Pay Later", "Bank Transfer"]

ecom_data = []
for i in range(600):
    dt = start_date + timedelta(days=random.randint(0, 300), hours=random.randint(8, 22))
    seg = random.choice(segments)
    dev = random.choice(devices)
    pay = random.choice(payments)
    cart = round(float(np.random.exponential(85) + 15), 2)
    shipping = 0.0 if cart > 100 else round(random.uniform(4.99, 14.99), 2)
    delivery_days = random.randint(1, 7)
    rating = random.choices([1, 2, 3, 4, 5], weights=[0.08, 0.07, 0.15, 0.40, 0.30])[0]
    returned = "Yes" if rating <= 2 and random.random() < 0.65 else "No"

    ecom_data.append({
        "OrderID": f"ORD-{50000 + i}",
        "OrderDate": dt.strftime("%Y-%m-%d %H:%M"),
        "CustomerSegment": seg,
        "DeviceType": dev,
        "PaymentMethod": pay,
        "CartValue": cart,
        "ShippingCost": shipping,
        "DeliveryDays": delivery_days,
        "CustomerRating": rating,
        "Returned": returned
    })
df_ecom = pd.DataFrame(ecom_data)
df_ecom.to_csv("datasets/samples/ecommerce.csv", index=False)

# 5. Weather Timeseries (1000 rows, hourly readings)
print("Generating weather_timeseries.csv...")
weather_start = datetime(2024, 6, 1, 0, 0)
weather_data = []
base_temp = 22.0
base_pressure = 1013.25

for i in range(1000):
    ts = weather_start + timedelta(hours=i)
    diurnal_cycle = np.sin((ts.hour - 6) * np.pi / 12) * 6.5
    temp = round(base_temp + diurnal_cycle + np.random.normal(0, 1.2), 2)
    humidity = round(np.clip(75 - diurnal_cycle * 3 + np.random.normal(0, 4), 20, 100), 1)
    wind_speed = round(np.clip(12 + np.random.normal(0, 5), 0, 65), 1)
    pressure = round(base_pressure + np.random.normal(0, 3.5), 1)
    precip = round(random.choices([0.0, random.uniform(0.5, 12.0)], weights=[0.82, 0.18])[0], 2)
    aqi = int(np.clip(45 + (100 - humidity) * 0.3 + np.random.normal(0, 10), 15, 250))

    weather_data.append({
        "Timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
        "StationID": "STN-WEST-01",
        "Temperature_C": temp,
        "Humidity_Pct": humidity,
        "Wind_Speed_Kmh": wind_speed,
        "Atmospheric_Pressure_HPa": pressure,
        "Precipitation_Mm": precip,
        "AirQualityIndex": aqi
    })
df_weather = pd.DataFrame(weather_data)
df_weather.to_csv("datasets/samples/weather_timeseries.csv", index=False)

print("All sample datasets successfully generated in datasets/samples/")
