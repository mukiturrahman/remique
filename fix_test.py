import re

with open('tests/free-plan.test.ts', 'r') as f:
    content = f.read()

# Replace hardcoded limits with FREE_MONTHLY_REMINDER_LIMIT
content = content.replace("reminderAllowance(4, 1), { allowed: true, remaining: 1 }", "reminderAllowance(FREE_MONTHLY_REMINDER_LIMIT - 1, 1), { allowed: true, remaining: 1 }")
content = content.replace("reminderAllowance(5, 1), { allowed: false, remaining: 0 }", "reminderAllowance(FREE_MONTHLY_REMINDER_LIMIT, 1), { allowed: false, remaining: 0 }")
content = content.replace("refuses the 6th reminder", "refuses the reminder past the limit")
content = content.replace("reminderAllowance(4, 2), { allowed: false, remaining: 1 }", "reminderAllowance(FREE_MONTHLY_REMINDER_LIMIT - 1, 2), { allowed: false, remaining: 1 }")
content = content.replace("reminderAllowance(9, 1).remaining", "reminderAllowance(FREE_MONTHLY_REMINDER_LIMIT + 4, 1).remaining")

with open('tests/free-plan.test.ts', 'w') as f:
    f.write(content)
