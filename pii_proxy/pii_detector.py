import re
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

@dataclass
class PIIMatch:
    entity_type: str        # e.g., "NAME", "EMAIL", "IP_ADDRESS"
    category_id: int        # 1 to 15 based on HIPAA / compliance list
    category_name: str      # Human readable category name
    start: int
    end: int
    text: str
    confidence: float

class PIIDetector:
    """
    Comprehensive PII Detector covering all 15 Safe Harbor / DPDP categories:
    1. Names (including initials or family/employer names)
    2. Geographical data smaller than a state (street address, city, county, ZIP code)
    3. Dates directly related to an individual (birth, admission, discharge, death; years excluded)
    4. Telephone numbers
    5. Fax numbers
    6. Email addresses
    7. Social Security numbers (SSN)
    8. Medical record numbers (MRN)
    9. Health plan beneficiary numbers
    10. Account numbers (bank/credit card)
    11. Certificate/license numbers
    12. Vehicle identifiers and serial numbers (VIN, license plates)
    13. Device identifiers and serial numbers (MAC, UUID, IMEI, Serial)
    14. Web URLs
    15. IP address numbers (IPv4 / IPv6)
    """

    CATEGORIES = {
        1: "Names",
        2: "Geographical Data",
        3: "Dates (Individual)",
        4: "Telephone Numbers",
        5: "Fax Numbers",
        6: "Email Addresses",
        7: "Social Security Numbers (SSN)",
        8: "Medical Record Numbers (MRN)",
        9: "Health Plan Beneficiary Numbers",
        10: "Account Numbers",
        11: "Certificate/License Numbers",
        12: "Vehicle Identifiers",
        13: "Device Identifiers",
        14: "Web URLs",
        15: "IP Addresses"
    }

    def __init__(self):
        self._compile_regexes()
        self._init_presidio()

    def _init_presidio(self):
        """Try initializing Microsoft Presidio / SpaCy if enabled via env var."""
        self.presidio_analyzer = None
        import os
        if os.getenv("ENABLE_PRESIDIO", "false").lower() == "true":
            try:
                import spacy
                if spacy.util.is_package("en_core_web_sm"):
                    from presidio_analyzer import AnalyzerEngine
                    self.presidio_analyzer = AnalyzerEngine()
            except Exception:
                self.presidio_analyzer = None

    def _compile_regexes(self):
        """Compile optimized regex patterns for exact match PII categories."""
        
        # 15. IP Address (IPv4 & IPv6)
        self.regex_ipv4 = re.compile(
            r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
        )
        self.regex_ipv6 = re.compile(
            r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|'
            r'\b(?:[0-9a-fA-F]{1,4}:){1,7}:|'
            r'::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b'
        )

        # 14. Web URLs
        self.regex_url = re.compile(
            r'\bhttps?://[^\s<>"{}|\\^`]+[^\s<>"{}|\\^`.,;:!?]|'
            r'\bwww\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s<>"{}|\\^`]*'
        )

        # 6. Email addresses
        self.regex_email = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
        )

        # 7. SSN
        self.regex_ssn = re.compile(
            r'\b\d{3}-\d{2}-\d{4}\b|'
            r'(?:SSN|Social Security|Soc Sec)[:#\s]+\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',
            re.IGNORECASE
        )

        # 5. Fax numbers (Check Fax keyword before general Phone)
        self.regex_fax = re.compile(
            r'(?:Fax|FAX|fax)[:#\s]+(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
        )

        # 4. Telephone numbers
        self.regex_phone = re.compile(
            r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|'
            r'\b\d{3}[-.\s]\d{4}\b|'
            r'(?:Phone|Tel|Mobile|Cell)[:#\s]+(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
            re.IGNORECASE
        )

        # 8. Medical Record Number (MRN)
        self.regex_mrn = re.compile(
            r'(?:MRN|Medical Record Number|Med Rec #|Record #)[:#\s]+[A-Za-z0-9-]{6,12}\b|'
            r'\bMRN-\d{6,10}\b',
            re.IGNORECASE
        )

        # 8. Patient IDs written as "id 512592" / "Patient ID: 512592"
        self.regex_patient_id = re.compile(
            r'\b(?i:patient\s+id|id)[:#\s]+\d{5,12}\b'
        )

        # 9. Health plan beneficiary numbers
        self.regex_health_plan = re.compile(
            r'(?:Health Plan|Beneficiary ID|Policy #|Member ID|Insurance ID|HICN|Medicare ID)[:#\s]+[A-Za-z0-9-]{7,15}\b',
            re.IGNORECASE
        )

        # 10. Account numbers (Credit Card + Financial Accounts)
        self.regex_credit_card = re.compile(
            r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b|'
            r'\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b'
        )
        self.regex_bank_account = re.compile(
            r'(?:Account #|Acct #|Bank Account|IBAN)[:#\s]+[A-Za-z0-9-]{8,22}\b',
            re.IGNORECASE
        )

        # 11. Certificate / License numbers
        self.regex_license = re.compile(
            r'(?:Driver\'?s License|DL #|License #|Cert #|Certificate #)[:#\s]+[A-Za-z0-9-]{6,16}\b',
            re.IGNORECASE
        )

        # 12. Vehicle Identifiers (VIN & License Plates)
        self.regex_vin = re.compile(
            r'(?:VIN|Vehicle ID)[:#\s]+[A-HJ-NPR-Z0-9]{17}\b|'
            r'\b[A-HJ-NPR-Z0-9]{17}\b',
            re.IGNORECASE
        )
        self.regex_license_plate = re.compile(
            r'(?:License Plate|Plate #|Tag #)[:#\s]+[A-Z0-9-]{3,8}\b',
            re.IGNORECASE
        )

        # 13. Device Identifiers (MAC, UUID, IMEI, Serial Number)
        self.regex_mac = re.compile(
            r'\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b'
        )
        self.regex_uuid = re.compile(
            r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b'
        )
        self.regex_device_sn = re.compile(
            r'(?:Serial Number|Serial #|IMEI|Device ID)[:#\s]+[A-Za-z0-9-]{8,20}\b',
            re.IGNORECASE
        )

        # 2. Geographical Data smaller than a state
        self.regex_zip = re.compile(
            r'(?:ZIP|Zip Code|Postal Code)[:#\s]+\d{5}(?:-\d{4})?\b|'
            r'\b\d{5}(?:-\d{4})?\b',
            re.IGNORECASE
        )
        self.regex_address = re.compile(
            r'(?:Address|Location)[:#\s]+[A-Za-z0-9\s.,#-]+?(?=\s*,|\s*Zip|\s*\n|$)|'
            r'\b\d{1,5}\s+[A-Za-z0-9\s.,#-]+?\s+(?:Street|St|Terrace|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Way)\b',
            re.IGNORECASE
        )
        self.regex_city_county = re.compile(
            r'(?:City|County|Town|Locality)[:#\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
        )

        # 3. Dates directly related to an individual (Birth, Admission, Discharge, Death)
        # Note: Excludes standalone 4-digit years like 2023 or 2026.
        self.regex_individual_date = re.compile(
            r'(?:DOB|Birth|Born|Admitted|Admission|Discharged|Discharge|Died|Death|Date of Birth|Date of Admission)[:#\s]+'
            r'(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})\b|'
            r'\b(?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12][0-9]|3[01])[/-](?:19|20)\d{2}\b|'
            r'\b(?:19|20)\d{2}[/-](?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12][0-9]|3[01])\b',
            re.IGNORECASE
        )

        # 1. Names (Titles, Prefixes, Patient/Employee Context) - Strictly Case Sensitive
        self.regex_name_context = re.compile(
            r'(?i:Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Patient|Employee|Doctor)[:#\s]+'
            r'([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)'
        )

    def detect(self, text: str) -> List[PIIMatch]:
        """Detect all PII entities in text and return non-overlapping list of matches sorted by start index."""
        matches: List[PIIMatch] = []

        # Helper to add regex matches
        def _add_matches(regex_obj, entity_type: str, category_id: int, confidence: float = 0.95):
            for m in regex_obj.finditer(text):
                matches.append(PIIMatch(
                    entity_type=entity_type,
                    category_id=category_id,
                    category_name=self.CATEGORIES[category_id],
                    start=m.start(),
                    end=m.end(),
                    text=m.group(0),
                    confidence=confidence
                ))

        # Run regex rules in priority order
        _add_matches(self.regex_email, "EMAIL", 6, 0.99)
        _add_matches(self.regex_url, "URL", 14, 0.98)
        _add_matches(self.regex_ipv4, "IP_ADDRESS", 15, 0.99)
        _add_matches(self.regex_ipv6, "IP_ADDRESS", 15, 0.99)
        _add_matches(self.regex_ssn, "SSN", 7, 0.98)
        _add_matches(self.regex_fax, "FAX", 5, 0.95)
        _add_matches(self.regex_phone, "PHONE", 4, 0.90)
        _add_matches(self.regex_mrn, "MRN", 8, 0.96)
        _add_matches(self.regex_patient_id, "PATIENT_ID", 8, 0.9)
        _add_matches(self.regex_health_plan, "HEALTH_BENEFICIARY_ID", 9, 0.95)
        _add_matches(self.regex_credit_card, "ACCOUNT_NUMBER", 10, 0.98)
        _add_matches(self.regex_bank_account, "ACCOUNT_NUMBER", 10, 0.95)
        _add_matches(self.regex_license, "LICENSE_NUMBER", 11, 0.94)
        _add_matches(self.regex_vin, "VEHICLE_ID", 12, 0.95)
        _add_matches(self.regex_license_plate, "VEHICLE_ID", 12, 0.92)
        _add_matches(self.regex_mac, "DEVICE_ID", 13, 0.98)
        _add_matches(self.regex_uuid, "DEVICE_ID", 13, 0.98)
        _add_matches(self.regex_device_sn, "DEVICE_ID", 13, 0.93)
        _add_matches(self.regex_zip, "GEO_DATA", 2, 0.95)
        _add_matches(self.regex_address, "GEO_DATA", 2, 0.92)
        _add_matches(self.regex_city_county, "GEO_DATA", 2, 0.88)
        _add_matches(self.regex_individual_date, "INDIVIDUAL_DATE", 3, 0.94)

        # Name context heuristic regex
        for m in self.regex_name_context.finditer(text):
            full_match = m.group(0)
            name_part = m.group(1) if m.lastindex and m.lastindex >= 1 else full_match
            start_idx = m.start(1) if m.lastindex and m.lastindex >= 1 else m.start()
            end_idx = m.end(1) if m.lastindex and m.lastindex >= 1 else m.end()
            matches.append(PIIMatch(
                entity_type="NAME",
                category_id=1,
                category_name=self.CATEGORIES[1],
                start=start_idx,
                end=end_idx,
                text=name_part,
                confidence=0.91
            ))

        # Secondary Presidio NLP analysis if installed
        if self.presidio_analyzer:
            try:
                results = self.presidio_analyzer.analyze(
                    text=text,
                    entities=["PERSON", "LOCATION", "NRP", "DATE_TIME"],
                    language="en"
                )
                for res in results:
                    if res.entity_type == "PERSON":
                        matches.append(PIIMatch(
                            entity_type="NAME",
                            category_id=1,
                            category_name=self.CATEGORIES[1],
                            start=res.start,
                            end=res.end,
                            text=text[res.start:res.end],
                            confidence=res.score
                        ))
                    elif res.entity_type in ["LOCATION", "GPE"]:
                        matches.append(PIIMatch(
                            entity_type="GEO_DATA",
                            category_id=2,
                            category_name=self.CATEGORIES[2],
                            start=res.start,
                            end=res.end,
                            text=text[res.start:res.end],
                            confidence=res.score
                        ))
            except Exception:
                pass

        # Deduplicate and remove overlapping ranges (keep highest confidence / longest match)
        sorted_matches = sorted(matches, key=lambda x: (x.start, -(x.end - x.start), -x.confidence))
        filtered: List[PIIMatch] = []
        last_end = -1

        for m in sorted_matches:
            if m.start >= last_end:
                filtered.append(m)
                last_end = m.end

        return filtered
