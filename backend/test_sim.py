import difflib

def is_duplicate(new_q, past_qs, threshold=0.8):
    new_q_lower = new_q.lower().strip()
    for pq in past_qs:
        pq_lower = pq.lower().strip()
        sim = difflib.SequenceMatcher(None, new_q_lower, pq_lower).ratio()
        if sim >= threshold:
            return True
    return False

past = ["What is the powerhouse of the cell?", "Who discovered penicillin?"]
print(is_duplicate("What's the powerhouse of the cell?", past))
print(is_duplicate("What is DNA?", past))
