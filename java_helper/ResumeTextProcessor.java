package java_helper;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * ResumeTextProcessor is a CLI helper utility written in Java.
 * It searches for target keywords (e.g. skills) inside a resume text file,
 * counts their occurrences, and outputs a visual frequency report.
 * 
 * Usage:
 *   javac java_helper/ResumeTextProcessor.java
 *   java java_helper.ResumeTextProcessor <path_to_txt_file> <comma,separated,keywords>
 */
public class ResumeTextProcessor {

    public static void main(String[] args) {
        System.out.println("=================================================");
        System.out.println("   Smart Resume Java Keyword Analyzer Utility");
        System.out.println("=================================================");

        if (args.length < 2) {
            System.out.println("Error: Missing parameters.");
            System.out.println("Usage:");
            System.out.println("  java java_helper.ResumeTextProcessor <file_path> <keyword1,keyword2,...>");
            System.out.println("Example:");
            System.out.println("  java java_helper.ResumeTextProcessor resume.txt java,python,docker,sql");
            System.out.println("=================================================");
            return;
        }

        String filePath = args[0];
        String[] keywords = args[1].split(",");

        System.out.println("Target File: " + filePath);
        System.out.print("Target Keywords: [");
        for (int i = 0; i < keywords.length; i++) {
            keywords[i] = keywords[i].trim().toLowerCase();
            System.out.print(keywords[i] + (i < keywords.length - 1 ? ", " : ""));
        }
        System.out.println("]\n");

        Map<String, Integer> keywordCounts = new HashMap<>();
        for (String kw : keywords) {
            if (!kw.isEmpty()) {
                keywordCounts.put(kw, 0);
            }
        }

        StringBuilder contentBuilder = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            while ((line = br.readLine()) != null) {
                contentBuilder.append(line).append(" ");
            }
        } catch (IOException e) {
            System.err.println("Fatal Error: Could not read file. Check if the path is correct. " + e.getMessage());
            return;
        }

        String fullText = contentBuilder.toString().toLowerCase();

        // Perform keyword searching
        for (String kw : keywordCounts.keySet()) {
            int count = 0;
            int lastIndex = 0;
            while (lastIndex != -1) {
                lastIndex = fullText.indexOf(kw, lastIndex);
                if (lastIndex != -1) {
                    count++;
                    lastIndex += kw.length();
                }
            }
            keywordCounts.put(kw, count);
        }

        // Output Result Statistics
        System.out.println("---------------- Keyword Scan Report ----------------");
        System.out.printf("%-20s | %-10s | %-20s\n", "Keyword / Skill", "Frequency", "Matches Visualization");
        System.out.println("-----------------------------------------------------");

        int totalMatches = 0;
        for (Map.Entry<String, Integer> entry : keywordCounts.entrySet()) {
            String kw = entry.getKey();
            int freq = entry.getValue();
            totalMatches += freq;

            StringBuilder stars = new StringBuilder();
            for (int i = 0; i < Math.min(freq, 20); i++) {
                stars.append("*");
            }
            if (freq > 20) {
                stars.append("+");
            }

            System.out.printf("%-20s | %-10d | %-20s\n", kw, freq, stars.toString());
        }

        System.out.println("-----------------------------------------------------");
        System.out.println("Total keyword references found: " + totalMatches);
        System.out.println("Scan completed successfully.");
        System.out.println("=================================================");
    }
}
