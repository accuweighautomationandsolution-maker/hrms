-- HRMS Initial Seeding Script for Oracle
-- Run this after oracle_setup.sql

-- 1. Initial Admin User (Credentials: admin@hrms.com / Admin@123)
-- Hash generated via standard algorithm (simulated)
INSERT INTO HRMS_USERS (EMAIL, PASSWORD_HASH, ROLE, FULL_NAME) 
VALUES ('admin@hrms.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'management', 'System Administrator');

-- 2. Employees Seed
INSERT INTO HRMS_EMPLOYEES (EMP_CODE, NAME, ROLE, DEPARTMENT, STATUS, EMP_TYPE, EMAIL, GROSS_SALARY, CATEGORY, JOINING_DATE, GRADE, BIOMETRIC_ID, UAN_NUMBER, ESIC_NUMBER, BANK_ACCOUNT)
VALUES ('AW-HR-001', 'Alice Smith', 'Software Engineer', 'Engineering', 'Active', 'Probation', 'alice@company.com', 120000, 'Staff Employee', TO_DATE('2022-01-10', 'YYYY-MM-DD'), 'A1', 1, '100012345678', '31000123450011001', '3029101002345 (HDFC)');

INSERT INTO HRMS_EMPLOYEES (EMP_CODE, NAME, ROLE, DEPARTMENT, STATUS, EMP_TYPE, EMAIL, GROSS_SALARY, CATEGORY, JOINING_DATE, GRADE, BIOMETRIC_ID, UAN_NUMBER, ESIC_NUMBER, BANK_ACCOUNT)
VALUES ('AW-OPS-402', 'Bob Johnson', 'Worker (Shop Floor)', 'Product', 'Active', 'Permanent', 'bob@company.com', 30000, 'On role worker', TO_DATE('2023-03-15', 'YYYY-MM-DD'), 'B2', 2, '100012344020', '31000123450011402', '9120100456789 (SBI)');

INSERT INTO HRMS_EMPLOYEES (EMP_CODE, NAME, ROLE, DEPARTMENT, STATUS, EMP_TYPE, EMAIL, GROSS_SALARY, CATEGORY, JOINING_DATE, GRADE, BIOMETRIC_ID, UAN_NUMBER, ESIC_NUMBER, BANK_ACCOUNT)
VALUES ('AW-HR-002', 'Charlie Davis', 'HR Specialist', 'Human Resources', 'On Leave', 'Permanent', 'charlie@company.com', 55000, 'Staff Employee', TO_DATE('2021-05-22', 'YYYY-MM-DD'), 'A2', 3, '100012340020', '31000123450011002', '4099101003456 (ICICI)');

-- 3. Leave Balances Seed (Linked to Employee IDs 1, 2, 3)
INSERT INTO HRMS_LEAVE_BALANCES (EMP_ID, SICK, CASUAL, PAID) VALUES (1, 5, 10, 15);
INSERT INTO HRMS_LEAVE_BALANCES (EMP_ID, SICK, CASUAL, PAID) VALUES (2, 3, 8, 12);
INSERT INTO HRMS_LEAVE_BALANCES (EMP_ID, SICK, CASUAL, PAID) VALUES (3, 4, 12, 18);

-- 4. Initial Notices
INSERT INTO HRMS_NOTICES (TITLE, CONTENT, AUTHOR, CREATED_AT)
VALUES ('Oracle Cloud Migration', 'The HRMS has successfully migrated to Oracle Cloud Autonomous Database. All systems are now synchronized for multi-user access.', 'System Admin', CURRENT_TIMESTAMP);

-- 5. Global Config (JSON)
INSERT INTO HRMS_CONFIG (KEY, VALUE)
VALUES ('BONUS_POLICY', '{"salaryThreshold": 21000, "calculationCeiling": 7000, "minWageOverride": 8500, "bonusPercentage": 8.33}');

COMMIT;
