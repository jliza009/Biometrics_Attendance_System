-- HR Attendance System — import into phpMyAdmin (MySQL 8+)
CREATE DATABASE IF NOT EXISTS hr_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hr_attendance;

CREATE TABLE system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  grace_period_minutes INT NOT NULL DEFAULT 10,
  missed_clock_in_reminder TINYINT(1) NOT NULL DEFAULT 1,
  missed_clock_out_reminder TINYINT(1) NOT NULL DEFAULT 1,
  escalate_to_manager TINYINT(1) NOT NULL DEFAULT 1,
  email_digest TINYINT(1) NOT NULL DEFAULT 0,
  leave_approval_alert TINYINT(1) NOT NULL DEFAULT 1,
  admin_pin VARCHAR(100) NOT NULL DEFAULT 'admin123',
  reminder_email_template TEXT,
  clock_out_reminder_template TEXT,
  smtp_host VARCHAR(255) DEFAULT '',
  smtp_port INT DEFAULT 587,
  smtp_user VARCHAR(255) DEFAULT '',
  smtp_pass VARCHAR(255) DEFAULT '',
  smtp_from_email VARCHAR(255) DEFAULT '',
  smtp_from_name VARCHAR(255) DEFAULT 'HR Attendance System',
  smtp_encryption VARCHAR(10) DEFAULT 'tls',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO system_settings (id) VALUES (1);

CREATE TABLE leave_policy (
  id INT PRIMARY KEY DEFAULT 1,
  year_start DATE NOT NULL,
  year_end DATE NOT NULL,
  annual_days INT NOT NULL DEFAULT 18,
  sick_days INT NOT NULL DEFAULT 14,
  emergency_days INT NOT NULL DEFAULT 5,
  maternity_days INT NOT NULL DEFAULT 90,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO leave_policy (id, year_start, year_end) VALUES (1, CONCAT(YEAR(CURDATE()), '-01-01'), CONCAT(YEAR(CURDATE()), '-12-31'));

CREATE TABLE shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  grace INT NOT NULL DEFAULT 10,
  location VARCHAR(255) DEFAULT 'Main Office',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO shifts (name, start_time, end_time, grace, location) VALUES
('Morning', '07:00', '15:00', 10, 'Main Office'),
('Afternoon', '14:00', '22:00', 10, 'Main Office'),
('Night', '22:00', '06:00', 15, 'Branch B'),
('Flexi', '09:00', '17:00', 30, 'Remote');

CREATE TABLE public_holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  recurring TINYINT(1) NOT NULL DEFAULT 0
);

INSERT INTO public_holidays (name, holiday_date, recurring) VALUES
('New Year''s Day', '2026-01-01', 1),
('Labour Day', '2026-05-01', 1),
('Independence Day', '2026-07-04', 1),
('Christmas Day', '2026-12-25', 1);

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL,
  shift_name VARCHAR(100) DEFAULT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  start_date DATE NOT NULL,
  fingerprint_id VARCHAR(50) DEFAULT NULL,
  fingerprint_template LONGTEXT DEFAULT NULL,
  password VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shift_assignments (
  employee_id INT PRIMARY KEY,
  shift_name VARCHAR(100) DEFAULT NULL,
  shift_id INT DEFAULT NULL,
  schedule_json JSON DEFAULT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE leave_balances (
  employee_id INT PRIMARY KEY,
  annual_allocated INT NOT NULL DEFAULT 18,
  annual_used INT NOT NULL DEFAULT 0,
  sick_allocated INT NOT NULL DEFAULT 14,
  sick_used INT NOT NULL DEFAULT 0,
  emergency_allocated INT NOT NULL DEFAULT 5,
  emergency_used INT NOT NULL DEFAULT 0,
  maternity_allocated INT NOT NULL DEFAULT 90,
  maternity_used INT NOT NULL DEFAULT 0,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL,
  leave_type VARCHAR(50) NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  days INT NOT NULL,
  reason TEXT,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE roster_cells (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  roster_year INT NOT NULL,
  roster_month INT NOT NULL,
  day_num INT NOT NULL,
  day_type VARCHAR(30) NOT NULL DEFAULT 'WORKING',
  UNIQUE KEY uk_roster (employee_id, roster_year, roster_month, day_num),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE clock_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL,
  shift_name VARCHAR(100) NOT NULL,
  expected_in VARCHAR(10) NOT NULL,
  actual_in VARCHAR(10) DEFAULT NULL,
  expected_out VARCHAR(10) NOT NULL,
  actual_out VARCHAR(10) DEFAULT NULL,
  total_hours DECIMAL(5,1) DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'not_yet',
  location VARCHAR(255) DEFAULT NULL,
  log_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_clock_date (log_date),
  INDEX idx_clock_emp (employee_id, log_date)
);

CREATE TABLE clock_feed (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_name VARCHAR(255) NOT NULL,
  feed_time VARCHAR(10) NOT NULL,
  feed_type ENUM('in','out') NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  notif_time VARCHAR(20) NOT NULL,
  notif_type VARCHAR(30) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  sent_at VARCHAR(50) NOT NULL,
  smtp_sent TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reminder_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  reminder_type ENUM('clock_in','clock_out') NOT NULL,
  log_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_reminder (employee_id, reminder_type, log_date)
);
