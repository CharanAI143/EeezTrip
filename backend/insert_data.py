import os
import certifi
import datetime
from pymongo import MongoClient

uri = "mongodb+srv://admin:admin123@cluster0.o6jzcic.mongodb.net/eeeztrip?retryWrites=true&w=majority&appName=Cluster0"

print("Connecting to MongoDB...")
client = MongoClient(uri, tlsCAFile=certifi.where())

db = client["eeeztrip"]

# Collections
users_col = db["users"]
trips_col = db["trips"]
bookings_col = db["bookings"]
group_sync_col = db["group_sync"]
reviews_col = db["reviews"]
destinations_col = db["destinations"]
notifications_col = db["notifications"]

# Clear existing data for a clean slate
users_col.delete_many({})
trips_col.delete_many({})
bookings_col.delete_many({})
group_sync_col.delete_many({})
reviews_col.delete_many({})
destinations_col.delete_many({})
notifications_col.delete_many({})

print("Inserting Users...")
users = [
    {"user_id": "user_123", "name": "Alice Smith", "email": "alice@example.com", "preferences": {"mood": "Relaxed"}},
    {"user_id": "user_456", "name": "Bob Jones", "email": "bob@example.com", "preferences": {"mood": "Adventure"}},
    {"user_id": "user_789", "name": "Charlie Brown", "email": "charlie@example.com", "preferences": {"mood": "Foodie"}}
]
users_col.insert_many(users)

print("Inserting Trips...")
trips = [
    {
        "user_id": "user_123", "label": "Paris Getaway", "destination": "Paris",
        "trip": {"title": "Romantic Paris", "days": 4}, "created_at": "2026-05-10T10:00:00Z"
    },
    {
        "user_id": "user_456", "label": "Bali Surf", "destination": "Bali",
        "trip": {"title": "Bali Adventure", "days": 7}, "created_at": "2026-05-11T10:00:00Z"
    },
    {
        "user_id": "user_789", "label": "Tokyo Eats", "destination": "Tokyo",
        "trip": {"title": "Tokyo Food Tour", "days": 5}, "created_at": "2026-05-12T10:00:00Z"
    }
]
trip_ids = []
for t in trips:
    res = trips_col.insert_one(t)
    trip_ids.append(str(res.inserted_id))

print("Inserting Bookings...")
bookings = [
    {"user_id": "user_123", "trip_id": trip_ids[0], "destination": "Paris", "check_in": "2026-06-01", "check_out": "2026-06-05", "guests": 2, "hotel": "Hotel de Paris", "status": "confirmed", "created_at": "2026-05-10T10:05:00Z"},
    {"user_id": "user_456", "trip_id": trip_ids[1], "destination": "Bali", "check_in": "2026-07-10", "check_out": "2026-07-17", "guests": 1, "hotel": "Surf Camp Bali", "status": "pending", "created_at": "2026-05-11T11:05:00Z"},
    {"user_id": "user_789", "trip_id": trip_ids[2], "destination": "Tokyo", "check_in": "2026-08-01", "check_out": "2026-08-06", "guests": 4, "hotel": "Shinjuku Grand", "status": "confirmed", "created_at": "2026-05-12T11:05:00Z"}
]
bookings_col.insert_many(bookings)

print("Inserting Group Sync...")
group_syncs = [
    {"session_id": "sync_abc123", "host_user_id": "user_123", "destination": "Paris", "members": ["user_123", "user_456"], "updated_at": "2026-05-10T12:00:00Z"},
    {"session_id": "sync_def456", "host_user_id": "user_789", "destination": "Tokyo", "members": ["user_789", "user_123"], "updated_at": "2026-05-12T12:00:00Z"}
]
group_sync_col.insert_many(group_syncs)

print("Inserting Reviews...")
reviews = [
    {"user_id": "user_123", "destination": "Paris", "rating": 5, "comment": "Amazing city! Loved the food and culture.", "created_at": "2026-06-06T10:00:00Z"},
    {"user_id": "user_456", "destination": "Bali", "rating": 4, "comment": "Great surfing, but a bit crowded during peak season.", "created_at": "2026-07-18T10:00:00Z"},
    {"user_id": "user_789", "destination": "Tokyo", "rating": 5, "comment": "Best food I have ever had. Extremely clean.", "created_at": "2026-08-10T10:00:00Z"}
]
reviews_col.insert_many(reviews)

print("Inserting Destinations...")
destinations = [
    {"name": "Paris", "country": "France", "tags": ["Romantic", "Culture", "Food"], "popularity_score": 98},
    {"name": "Bali", "country": "Indonesia", "tags": ["Adventure", "Beaches", "Relaxed"], "popularity_score": 95},
    {"name": "Tokyo", "country": "Japan", "tags": ["Foodie", "Culture", "City"], "popularity_score": 97},
    {"name": "Rome", "country": "Italy", "tags": ["History", "Food", "Romantic"], "popularity_score": 96}
]
destinations_col.insert_many(destinations)

print("Inserting Notifications...")
notifications = [
    {"user_id": "user_123", "message": "Your Paris booking is confirmed!", "read": False, "created_at": "2026-05-10T10:10:00Z"},
    {"user_id": "user_456", "message": "Alice invited you to join the Paris trip.", "read": True, "created_at": "2026-05-10T12:05:00Z"},
    {"user_id": "user_789", "message": "Reminder: Tokyo trip coming up in 2 weeks.", "read": False, "created_at": "2026-07-15T09:00:00Z"}
]
notifications_col.insert_many(notifications)

print("Database initialization and data insertion complete!")
client.close()
