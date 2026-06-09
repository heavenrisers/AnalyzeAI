def generate_schedule(topics, days, hours_per_day):
    """
    topics       : list of topic strings
    days         : number of days available to study
    hours_per_day: hours available per day
    Returns      : list of { day, date, tasks }
    """
    if not topics or days <= 0 or hours_per_day <= 0:
        return []

    total_hours = days * hours_per_day
    hours_per_topic = round(total_hours / len(topics), 1)

    # Assign topics to days
    schedule = []
    topic_index = 0
    topics_per_day = max(1, round(len(topics) / days))

    for day in range(1, days + 1):
        day_topics = []

        for _ in range(topics_per_day):
            if topic_index < len(topics):
                day_topics.append({
                    "topic": topics[topic_index],
                    "hours": hours_per_topic
                })
                topic_index += 1

        if day_topics:
            schedule.append({
                "day": day,
                "label": f"Day {day}",
                "tasks": day_topics
            })

    # If any topics are left over, add to last day
    while topic_index < len(topics):
        schedule[-1]["tasks"].append({
            "topic": topics[topic_index],
            "hours": hours_per_topic
        })
        topic_index += 1

    return schedule