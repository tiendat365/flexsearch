rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 1 }
  ]
});

// Đợi replica set khởi tạo
sleep(2000);

// Tạo user admin
db.createUser({
  user: "admin",
  pwd: "password123",
  roles: [
    { role: "readWrite", db: "flexsearch" },
    { role: "dbAdmin", db: "flexsearch" }
  ]
});

print("MongoDB Replica Set đã được khởi tạo thành công!");
print("Primary: mongo1:27017");
print("Secondaries: mongo2:27017, mongo3:27017");