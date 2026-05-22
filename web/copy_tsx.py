import re

with open("../docs/superpowers/plans/2026-05-22-web-ui-redesign-plan.md", "r") as f:
    text = f.read()

pattern = r"### Task 4(.*?)\`\`\`tsx(.*?)export function TransactionLedger(.*?)return \((.*?)\n}\n\`\`\`"

match = re.search(pattern, text, re.DOTALL)
if match:
    code = "\"use client\"\n\n" + match.group(2).strip() + "\n\nexport function TransactionLedger" + match.group(3) + "return (" + match.group(4) + "\n}\n"
    with open("src/app/components/TransactionLedger.tsx", "w") as f:
        f.write(code)
    print("Success")
else:
    print("Failed")
