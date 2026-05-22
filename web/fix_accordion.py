with open("src/app/components/TransactionLedger.tsx", "r") as f:
    text = f.read()

text = text.replace('type="single"', '')
text = text.replace('collapsible', '')
text = text.replace('<Accordion className="w-full"   >', '<Accordion className="w-full">')

with open("src/app/components/TransactionLedger.tsx", "w") as f:
    f.write(text)
