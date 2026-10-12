import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.io.*;
import java.util.*;
import java.util.regex.*;

public class GymServer {

    private static final String URL =
            "jdbc:mysql://localhost:3306/gym_db";

    private static final String USER = "root";

    // Keep your actual MySQL password here.
    private static final String PASSWORD =
            "password";

    private static final Map<String, String> TABLES =
            new LinkedHashMap<>();

    static {
        TABLES.put("members", "member");
        TABLES.put("trainers", "trainer");
        TABLES.put("attendance", "attendance");
        TABLES.put("vitals", "vitals");
        TABLES.put("diet-plans", "diet_plan");
        TABLES.put("workout-plans", "workout_plan");
        TABLES.put("equipment", "equipment");
        TABLES.put("member-phones", "member_phone");
        TABLES.put("member-emails", "member_email");
        TABLES.put("trainer-phones", "trainer_phone");
        TABLES.put("instructs-on", "instructs_on");
        TABLES.put("uses", "uses");
    }

    public static void main(String[] args) throws Exception {

        HttpServer server = HttpServer.create(
                new InetSocketAddress(8080), 0);

        server.createContext("/api/", GymServer::handleRequest);

        server.start();

        System.out.println(
                "Gym backend running at http://localhost:8080");
    }

    private static void handleRequest(HttpExchange exchange)
            throws IOException {

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Origin", "*");

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS");

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Headers",
                "Content-Type");

        exchange.getResponseHeaders().set(
                "Content-Type",
                "application/json; charset=UTF-8");

        String method = exchange.getRequestMethod();

        if (method.equalsIgnoreCase("OPTIONS")) {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }

        String path = exchange.getRequestURI().getPath();
        String endpoint = path.substring("/api/".length());

        try {
            if (!TABLES.containsKey(endpoint)) {
                send(exchange, 404,
                        "{\"error\":\"Unknown API endpoint\"}");
                return;
            }

            String table = TABLES.get(endpoint);

            if (method.equalsIgnoreCase("GET")) {
                send(exchange, 200, getRecords(table));

            } else if (method.equalsIgnoreCase("POST")) {
                String body = new String(
                        exchange.getRequestBody().readAllBytes(),
                        StandardCharsets.UTF_8);

                Map<String, String> data = parseJson(body);

                insertRecord(table, data);

                send(exchange, 201,
                        "{\"message\":\"Record added successfully\"}");

            } else {
                send(exchange, 405,
                        "{\"error\":\"Method not allowed\"}");
            }

        } catch (Exception e) {
            e.printStackTrace();

            send(exchange, 500,
                    "{\"error\":\"Request failed. Check the Java console.\"}");
        }
    }

    private static String getRecords(String table)
            throws SQLException {

        StringBuilder json = new StringBuilder("[");
        boolean first = true;

        String sql = "SELECT * FROM `" + table + "`";

        try (Connection con = DriverManager.getConnection(
                    URL, USER, PASSWORD);
             Statement stmt = con.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            ResultSetMetaData meta = rs.getMetaData();
            int count = meta.getColumnCount();

            while (rs.next()) {
                if (!first) {
                    json.append(",");
                }

                first = false;
                json.append("{");

                for (int i = 1; i <= count; i++) {
                    if (i > 1) {
                        json.append(",");
                    }

                    String column = meta.getColumnLabel(i);
                    Object value = rs.getObject(i);

                    json.append(quote(column))
                        .append(":")
                        .append(value == null
                                ? "null"
                                : quote(value.toString()));
                }

                json.append("}");
            }
        }

        json.append("]");
        return json.toString();
    }

    private static void insertRecord(
            String table,
            Map<String, String> data) throws SQLException {

        if (data.isEmpty()) {
            throw new IllegalArgumentException(
                    "No record data received");
        }

        Set<String> allowed = getColumns(table);

        Map<String, String> valid = new LinkedHashMap<>();

        for (Map.Entry<String, String> entry : data.entrySet()) {
            if (allowed.contains(entry.getKey())) {
                valid.put(entry.getKey(), entry.getValue());
            }
        }

        if (valid.isEmpty()) {
            throw new IllegalArgumentException(
                    "No matching database columns were supplied");
        }

        StringBuilder sql = new StringBuilder(
                "INSERT INTO `" + table + "` (");

        StringBuilder placeholders = new StringBuilder();

        int index = 0;

        for (String column : valid.keySet()) {
            if (index > 0) {
                sql.append(",");
                placeholders.append(",");
            }

            sql.append("`").append(column).append("`");
            placeholders.append("?");

            index++;
        }

        sql.append(") VALUES (")
           .append(placeholders)
           .append(")");

        try (Connection con = DriverManager.getConnection(
                    URL, USER, PASSWORD);
             PreparedStatement ps =
                    con.prepareStatement(sql.toString())) {

            int i = 1;

            for (String value : valid.values()) {
                if (value == null) {
                    ps.setNull(i++, Types.NULL);
                } else {
                    ps.setString(i++, value);
                }
            }

            ps.executeUpdate();
        }
    }

    private static Set<String> getColumns(String table)
            throws SQLException {

        Set<String> columns = new HashSet<>();

        try (Connection con = DriverManager.getConnection(
                    URL, USER, PASSWORD);
             ResultSet rs = con.getMetaData()
                    .getColumns("gym_db", null, table, null)) {

            while (rs.next()) {
                columns.add(rs.getString("COLUMN_NAME"));
            }
        }

        return columns;
    }

    private static Map<String, String> parseJson(String json) {

        Map<String, String> result = new LinkedHashMap<>();

        Pattern pattern = Pattern.compile(
                "\"([^\"]+)\"\\s*:\\s*" +
                "(?:\"((?:\\\\.|[^\"])*)\"|([^,}\\s]+))");

        Matcher matcher = pattern.matcher(json);

        while (matcher.find()) {
            String key = matcher.group(1);
            String value = matcher.group(2) != null
                    ? matcher.group(2)
                    : matcher.group(3);

            if ("null".equals(value)) {
                result.put(key, null);
            } else {
                result.put(key, value);
            }
        }

        return result;
    }

    private static String quote(String value) {

        if (value == null) {
            return "null";
        }

        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
    }

    private static void send(
            HttpExchange exchange,
            int status,
            String response) throws IOException {

        byte[] bytes = response.getBytes(
                StandardCharsets.UTF_8);

        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}